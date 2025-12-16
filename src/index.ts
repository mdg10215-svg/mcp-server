import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { InferenceClient } from '@huggingface/inference'

// ==================== Smithery 설정 스키마 ====================
// 사용자가 서버에 연결할 때 제공해야 하는 설정을 정의합니다
export const configSchema = z.object({
    hfToken: z
        .string()
        .optional()
        .describe('Hugging Face API 토큰 (이미지 생성 기능에 필요)')
})

// 설정 타입 추출
type Config = z.infer<typeof configSchema>

// ==================== Smithery createServer 함수 ====================
// Smithery 배포를 위한 기본 export 함수
export default function createServer({ config }: { config?: Config } = {}) {
    // Create server instance
    const server = new McpServer({
        name: 'test-mcp-server',
        version: '1.0.0'
    })

    // 설정에서 HF 토큰 가져오기 (환경 변수 폴백)
    const hfToken = config?.hfToken || process.env.HF_TOKEN

    server.registerTool(
        'greet',
        {
        description: '이름과 언어를 입력하면 인사말을 반환합니다.',
        inputSchema: z.object({
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en', 'es', 'ja'])
                .optional()
                .default('en')
                .describe('인사 언어 (기본값: en)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('인사말')
                    })
                )
                .describe('인사말')
        })
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님!`
                : language === 'es'
                ? `¡Hola, ${name}! 👋 ¡Mucho gusto!`
                : language === 'ja'
                ? `こんにちは, ${name}さん! 👋 はじめまして!`
                : `Hey there, ${name}! 👋 Nice to meet you!`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greeting
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: greeting
                    }
                ]
            }
        }
    }
)

    server.registerTool(
        'calculator',
        {
        description: '2개의 숫자와 연산자를 입력받아 계산 결과를 반환합니다.',
        inputSchema: z.object({
            num1: z.number().describe('첫 번째 숫자'),
            num2: z.number().describe('두 번째 숫자'),
            operator: z
                .enum(['+', '-', '*', '/'])
                .describe('연산자 (+, -, *, /)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('계산 결과')
                    })
                )
                .describe('계산 결과')
        })
    },
    async ({ num1, num2, operator }) => {
        let result: number

        switch (operator) {
            case '+':
                result = num1 + num2
                break
            case '-':
                result = num1 - num2
                break
            case '*':
                result = num1 * num2
                break
            case '/':
                if (num2 === 0) {
                    throw new Error('0으로 나눌 수 없습니다.')
                }
                result = num1 / num2
                break
            default:
                throw new Error(`지원하지 않는 연산자입니다: ${operator}`)
        }

        const resultText = `${num1} ${operator} ${num2} = ${result}`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

// ==================== 유틸리티 함수 ====================

// 소수 판별 함수
function isPrime(n: number): boolean {
    if (n < 2) return false
    if (n === 2) return true
    if (n % 2 === 0) return false

    const sqrt = Math.sqrt(n)
    for (let i = 3; i <= sqrt; i += 2) {
        if (n % i === 0) return false
    }
    return true
}

// 날씨 코드를 텍스트로 변환하는 함수
function getWeatherDescription(code: number): string {
    const weatherCodes: Record<number, string> = {
        0: '맑음',
        1: '대체로 맑음',
        2: '부분적으로 흐림',
        3: '흐림',
        45: '안개',
        48: '서리 안개',
        51: '가벼운 이슬비',
        53: '적당한 이슬비',
        55: '강한 이슬비',
        56: '가벼운 동결 이슬비',
        57: '강한 동결 이슬비',
        61: '가벼운 비',
        63: '적당한 비',
        65: '강한 비',
        66: '가벼운 동결 비',
        67: '강한 동결 비',
        71: '가벼운 눈',
        73: '적당한 눈',
        75: '강한 눈',
        77: '눈알',
        80: '가벼운 소나기',
        81: '적당한 소나기',
        82: '강한 소나기',
        85: '가벼운 눈 소나기',
        86: '강한 눈 소나기',
        95: '뇌우',
        96: '우박을 동반한 뇌우',
        99: '강한 우박을 동반한 뇌우'
    }
    return weatherCodes[code] || `날씨 코드: ${code}`
}

// Uptime 포맷팅 함수
function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    const parts: string[] = []
    if (days > 0) parts.push(`${days}일`)
    if (hours > 0) parts.push(`${hours}시간`)
    if (minutes > 0) parts.push(`${minutes}분`)
    if (secs > 0 || parts.length === 0) parts.push(`${secs}초`)

    return parts.join(' ')
}

// ==================== MCP 도구 등록 ====================

    server.registerTool(
        'primeNumbers',
        {
        description: '특정 범위의 시작값과 마지막 값을 입력받아 해당 구간에 존재하는 모든 소수를 반환합니다.',
        inputSchema: z.object({
            start: z.number().int().describe('범위의 시작값'),
            end: z.number().int().describe('범위의 마지막 값')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('소수 목록')
                    })
                )
                .describe('소수 목록')
        })
    },
    async ({ start, end }) => {
        if (start > end) {
            throw new Error('시작값이 마지막 값보다 클 수 없습니다.')
        }

        const primes: number[] = []
        const actualStart = Math.max(2, start) // 소수는 2부터 시작

        for (let i = actualStart; i <= end; i++) {
            if (isPrime(i)) {
                primes.push(i)
            }
        }

        const resultText = primes.length > 0
            ? `범위 [${start}, ${end}] 내의 소수: ${primes.join(', ')} (총 ${primes.length}개)`
            : `범위 [${start}, ${end}] 내에 소수가 없습니다.`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

    server.registerTool(
        'currentTime',
        {
        description: '현재 시간을 반환합니다. timezone을 입력하면 해당 timezone 시간을 반환하고, 입력하지 않으면 대한민국 시간을 반환합니다.',
        inputSchema: z.object({
            timezone: z
                .string()
                .optional()
                .default('Asia/Seoul')
                .describe('타임존 (예: Asia/Seoul, America/New_York, Europe/London 등). 기본값: Asia/Seoul')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('현재 시간')
                    })
                )
                .describe('현재 시간')
        })
    },
    async ({ timezone }) => {
        try {
            const now = new Date()
            const timezoneToUse = timezone || 'Asia/Seoul'

            // 날짜와 시간을 포맷팅
            const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
                timeZone: timezoneToUse,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })

            const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
                timeZone: timezoneToUse,
                timeZoneName: 'short'
            })

            const formattedDate = dateFormatter.format(now)
            const timeZoneName = timeFormatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || timezoneToUse

            const resultText = `현재 시간 (${timeZoneName}): ${formattedDate}`

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ],
                structuredContent: {
                    content: [
                        {
                            type: 'text' as const,
                            text: resultText
                        }
                    ]
                }
            }
        } catch (error) {
            throw new Error(`유효하지 않은 타임존입니다: ${timezone}`)
        }
    }
)

    server.registerTool(
        'geocode',
        {
        description: '도시 이름이나 주소를 입력받아서 위도와 경도 좌표를 반환합니다. Nominatim OpenStreetMap API를 사용합니다.',
        inputSchema: z.object({
            address: z.string().describe('도시 이름이나 주소 (예: "Seoul", "Paris, France", "1600 Amphitheatre Parkway, Mountain View, CA")')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('위도와 경도 좌표')
                    })
                )
                .describe('위도와 경도 좌표')
        })
    },
    async ({ address }) => {
        try {
            // 입력값 검증
            const trimmedAddress = address.trim()
            if (!trimmedAddress) {
                throw new Error('주소가 비어있습니다.')
            }

            // Nominatim API 엔드포인트
            const apiUrl = 'https://nominatim.openstreetmap.org/search'
            const params = new URLSearchParams({
                q: trimmedAddress, // URLSearchParams가 자동으로 인코딩함
                format: 'json',
                limit: '1',
                addressdetails: '1'
            })

            const url = `${apiUrl}?${params.toString()}`

            // HTTP 요청 (User-Agent 헤더 필수, 타임아웃 설정)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'MCP-Server/1.0.0'
                    },
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`Nominatim API 요청 실패: ${response.status} ${response.statusText}`)
                }

                const data = await response.json()

                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error(`주소를 찾을 수 없습니다: ${trimmedAddress}`)
                }

                const result = data[0]
                const lat = parseFloat(result.lat)
                const lon = parseFloat(result.lon)
                const displayName = result.display_name || trimmedAddress

                const resultText = `주소: ${displayName}\n위도: ${lat}\n경도: ${lon}`

                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: resultText
                        }
                    ],
                    structuredContent: {
                        content: [
                            {
                                type: 'text' as const,
                                text: resultText
                            }
                        ]
                    }
                }
            } catch (fetchError) {
                clearTimeout(timeoutId)
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.')
                }
                throw fetchError
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`지오코딩 오류: ${error.message}`)
            }
            throw new Error(`지오코딩 오류가 발생했습니다.`)
        }
    }
)

    server.registerTool(
        'get-weather',
        {
        description: '위도와 경도 좌표, 예보 기간을 입력받아서 해당 위치의 현재 날씨와 예보 정보를 제공합니다. Open-Meteo Weather API를 사용합니다.',
        inputSchema: z.object({
            latitude: z.number().describe('위도 좌표'),
            longitude: z.number().describe('경도 좌표'),
            forecast_days: z
                .number()
                .int()
                .min(1)
                .max(16)
                .optional()
                .default(7)
                .describe('예보 기간 (일 단위, 기본값: 7일, 최대: 16일)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('날씨 정보')
                    })
                )
                .describe('날씨 정보')
        })
    },
    async ({ latitude, longitude, forecast_days }) => {
        try {
            // Open-Meteo API 엔드포인트
            const apiUrl = 'https://api.open-meteo.com/v1/forecast'
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                forecast_days: (forecast_days || 7).toString(),
                hourly: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
                timezone: 'auto'
            })

            const url = `${apiUrl}?${params.toString()}`

            // HTTP 요청 (타임아웃 설정)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

            try {
                const response = await fetch(url, {
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`Open-Meteo API 요청 실패: ${response.status} ${response.statusText}`)
                }

                const data = await response.json()

                if (data.error) {
                    throw new Error(`Open-Meteo API 오류: ${data.reason || '알 수 없는 오류'}`)
                }

                // 현재 날씨 정보 (hourly 데이터의 첫 번째 값)
                const currentTemp = data.hourly?.temperature_2m?.[0]
                const currentHumidity = data.hourly?.relative_humidity_2m?.[0]
                const currentPrecipitation = data.hourly?.precipitation?.[0]
                const currentWeatherCode = data.hourly?.weather_code?.[0]
                const currentWindSpeed = data.hourly?.wind_speed_10m?.[0]
                const currentTime = data.hourly?.time?.[0]

                // 현재 날씨 정보 포맷팅
                let resultText = `=== 현재 날씨 ===\n`
                resultText += `위치: 위도 ${latitude}, 경도 ${longitude}\n`
                resultText += `시간: ${currentTime || 'N/A'}\n`
                resultText += `온도: ${currentTemp !== undefined ? `${currentTemp}°C` : 'N/A'}\n`
                resultText += `습도: ${currentHumidity !== undefined ? `${currentHumidity}%` : 'N/A'}\n`
                resultText += `강수량: ${currentPrecipitation !== undefined ? `${currentPrecipitation}mm` : '0mm'}\n`
                resultText += `풍속: ${currentWindSpeed !== undefined ? `${currentWindSpeed}km/h` : 'N/A'}\n`
                resultText += `날씨: ${currentWeatherCode !== undefined ? getWeatherDescription(currentWeatherCode) : 'N/A'}\n\n`

                // 일별 예보 정보
                if (data.daily && data.daily.time && data.daily.time.length > 0) {
                    resultText += `=== ${forecast_days || 7}일 예보 ===\n`
                    const days = Math.min((forecast_days || 7), data.daily.time.length)

                    for (let i = 0; i < days; i++) {
                        const date = data.daily.time[i]
                        const maxTemp = data.daily.temperature_2m_max?.[i]
                        const minTemp = data.daily.temperature_2m_min?.[i]
                        const precipitation = data.daily.precipitation_sum?.[i]
                        const weatherCode = data.daily.weather_code?.[i]

                        resultText += `\n${date}:\n`
                        resultText += `  최고온도: ${maxTemp !== undefined ? `${maxTemp}°C` : 'N/A'}\n`
                        resultText += `  최저온도: ${minTemp !== undefined ? `${minTemp}°C` : 'N/A'}\n`
                        resultText += `  강수량: ${precipitation !== undefined ? `${precipitation}mm` : '0mm'}\n`
                        resultText += `  날씨: ${weatherCode !== undefined ? getWeatherDescription(weatherCode) : 'N/A'}\n`
                    }
                }

                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: resultText
                        }
                    ],
                    structuredContent: {
                        content: [
                            {
                                type: 'text' as const,
                                text: resultText
                            }
                        ]
                    }
                }
            } catch (fetchError) {
                clearTimeout(timeoutId)
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.')
                }
                throw fetchError
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`날씨 정보 조회 오류: ${error.message}`)
            }
            throw new Error(`날씨 정보 조회 오류가 발생했습니다.`)
        }
    }
)

    server.registerTool(
        'generate-image',
        {
        description: '텍스트 프롬프트를 입력받아서 AI 이미지를 생성합니다. Hugging Face Inference API를 사용합니다.',
        inputSchema: z.object({
            prompt: z.string().describe('이미지를 생성할 텍스트 프롬프트')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('image'),
                        data: z.string().describe('base64로 인코딩된 이미지 데이터'),
                        mimeType: z.string().describe('이미지 MIME 타입')
                    })
                )
                .describe('생성된 이미지')
        })
    },
    async ({ prompt }) => {
        try {
            // 입력값 검증
            const trimmedPrompt = prompt.trim()
            if (!trimmedPrompt) {
                throw new Error('프롬프트가 비어있습니다.')
            }

            // Hugging Face 토큰 확인 및 사용
            if (!hfToken) {
                throw new Error('HF_TOKEN 환경 변수 또는 config.hfToken이 설정되지 않았습니다.')
            }

            // Hugging Face Inference Client 초기화 (요청 시마다 생성)
            const hfClient = new InferenceClient(hfToken)

            // 이미지 생성 요청
            const imageBlob = await hfClient.textToImage({
                provider: 'auto',
                model: 'black-forest-labs/FLUX.1-schnell',
                inputs: trimmedPrompt,
                parameters: { num_inference_steps: 5 }
            })

            // Blob을 base64로 변환
            // Hugging Face API는 Blob을 반환하므로, Blob 타입으로 처리
            let base64Data: string
            if (typeof imageBlob === 'object' && imageBlob !== null && 'arrayBuffer' in imageBlob) {
                // Blob 객체인 경우
                const arrayBuffer = await (imageBlob as Blob).arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                base64Data = buffer.toString('base64')
            } else if (typeof imageBlob === 'string') {
                // 이미 base64 문자열인 경우
                base64Data = imageBlob
            } else {
                // Buffer나 ArrayBuffer인 경우
                const buffer = Buffer.isBuffer(imageBlob) 
                    ? imageBlob 
                    : Buffer.from(imageBlob as ArrayBuffer)
                base64Data = buffer.toString('base64')
            }

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                ],
                structuredContent: {
                    content: [
                        {
                            type: 'image' as const,
                            data: base64Data,
                            mimeType: 'image/png'
                        }
                    ]
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`이미지 생성 오류: ${error.message}`)
            }
            throw new Error(`이미지 생성 오류가 발생했습니다.`)
        }
    }
)

    // 서버 시작 시간 기록
    const serverStartTime = new Date()
    const serverName = 'test-mcp-server'

    server.registerResource(
        'server-info',
        'mcp://server-info',
        {
        description: '현재 서버 정보와 사용 가능한 도구 목록을 반환합니다.',
        mimeType: 'application/json'
    },
    async () => {
        const serverInfo = {
            server: {
                name: serverName,
                version: '1.0.0',
                startTime: serverStartTime.toISOString(),
                uptime: Math.floor(process.uptime()),
                uptimeFormatted: formatUptime(process.uptime())
            },
            tools: [
                {
                    name: 'greet',
                    description: '이름과 언어를 입력하면 인사말을 반환합니다.',
                    parameters: {
                        name: '인사할 사람의 이름 (문자열)',
                        language: '인사 언어 - ko, en, es, ja 중 선택 (기본값: en)'
                    }
                },
                {
                    name: 'calculator',
                    description: '2개의 숫자와 연산자를 입력받아 계산 결과를 반환합니다.',
                    parameters: {
                        num1: '첫 번째 숫자',
                        num2: '두 번째 숫자',
                        operator: '연산자 - +, -, *, / 중 선택'
                    }
                },
                {
                    name: 'primeNumbers',
                    description: '특정 범위의 시작값과 마지막 값을 입력받아 해당 구간에 존재하는 모든 소수를 반환합니다.',
                    parameters: {
                        start: '범위의 시작값 (정수)',
                        end: '범위의 마지막 값 (정수)'
                    }
                },
                {
                    name: 'currentTime',
                    description: '현재 시간을 반환합니다. timezone을 입력하면 해당 timezone 시간을 반환하고, 입력하지 않으면 대한민국 시간을 반환합니다.',
                    parameters: {
                        timezone: '타임존 (예: Asia/Seoul, America/New_York, Europe/London 등). 기본값: Asia/Seoul'
                    }
                },
                {
                    name: 'geocode',
                    description: '도시 이름이나 주소를 입력받아서 위도와 경도 좌표를 반환합니다. Nominatim OpenStreetMap API를 사용합니다.',
                    parameters: {
                        address: '도시 이름이나 주소 (예: "Seoul", "Paris, France", "1600 Amphitheatre Parkway, Mountain View, CA")'
                    }
                },
                {
                    name: 'get-weather',
                    description: '위도와 경도 좌표, 예보 기간을 입력받아서 해당 위치의 현재 날씨와 예보 정보를 제공합니다. Open-Meteo Weather API를 사용합니다.',
                    parameters: {
                        latitude: '위도 좌표',
                        longitude: '경도 좌표',
                        forecast_days: '예보 기간 (일 단위, 기본값: 7일, 최대: 16일)'
                    }
                },
                {
                    name: 'generate-image',
                    description: '텍스트 프롬프트를 입력받아서 AI 이미지를 생성합니다. Hugging Face Inference API를 사용합니다.',
                    parameters: {
                        prompt: '이미지를 생성할 텍스트 프롬프트'
                    }
                }
            ],
            resources: [
                {
                    name: 'server-info',
                    description: '현재 서버 정보와 사용 가능한 도구 목록을 반환합니다.',
                    uri: 'mcp://server-info'
                }
            ],
            timestamp: new Date().toISOString()
        }

        return {
            contents: [
                {
                    uri: 'mcp://server-info',
                    mimeType: 'application/json',
                    text: JSON.stringify(serverInfo, null, 2)
                }
            ]
        }
    }
)

// ==================== MCP Prompt 등록 ====================

// 코드 리뷰 프롬프트 템플릿
const codeReviewPromptTemplate = `다음 코드를 리뷰해주세요. 다음 항목들을 중심으로 검토해주세요:

## 리뷰 체크리스트

### 1. 코드 품질
- [ ] 가독성: 코드가 명확하고 이해하기 쉬운가?
- [ ] 네이밍: 변수, 함수, 클래스 이름이 의미를 잘 전달하는가?
- [ ] 주석: 필요한 곳에 적절한 주석이 있는가?

### 2. 기능성
- [ ] 로직: 코드가 의도한 대로 동작하는가?
- [ ] 예외 처리: 에러 케이스가 적절히 처리되었는가?
- [ ] 엣지 케이스: 경계 조건이 고려되었는가?

### 3. 성능
- [ ] 효율성: 불필요한 연산이나 중복이 없는가?
- [ ] 메모리: 메모리 사용이 최적화되었는가?
- [ ] 알고리즘: 더 효율적인 방법이 있는가?

### 4. 보안
- [ ] 입력 검증: 사용자 입력이 적절히 검증되는가?
- [ ] 보안 취약점: SQL Injection, XSS 등의 취약점이 없는가?
- [ ] 권한 관리: 적절한 권한 체크가 있는가?

### 5. 유지보수성
- [ ] 모듈화: 코드가 적절히 분리되어 있는가?
- [ ] 재사용성: 코드 재사용이 가능한가?
- [ ] 테스트 가능성: 테스트하기 쉬운 구조인가?

### 6. 스타일 및 컨벤션
- [ ] 코딩 스타일: 프로젝트의 코딩 컨벤션을 따르는가?
- [ ] 포맷팅: 일관된 포맷팅이 적용되었는가?
- [ ] 구조: 적절한 디렉토리 구조를 따르는가?

## 리뷰할 코드

\`\`\`
{code}
\`\`\`

## 리뷰 요청사항
{reviewFocus}

---

위 체크리스트를 기반으로 상세한 코드 리뷰를 작성해주세요. 개선 사항이 있다면 구체적인 예시와 함께 제안해주세요.`

    server.registerPrompt(
        'code-review',
        {
        description: '코드를 입력받아서 코드 리뷰를 위한 프롬프트를 생성합니다.',
        argsSchema: {
            code: z.string().describe('리뷰할 코드'),
            reviewFocus: z
                .string()
                .optional()
                .describe('특별히 집중해서 리뷰할 항목 (선택사항). 예: "성능 최적화", "보안", "가독성" 등')
        }
    },
    async (args) => {
        const code = args.code || ''
        const reviewFocus = args.reviewFocus || '전반적인 코드 품질'

        // 프롬프트 템플릿에 코드와 리뷰 포커스 삽입
        const prompt = codeReviewPromptTemplate
            .replace('{code}', code)
            .replace('{reviewFocus}', reviewFocus)

        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: prompt
                    }
                }
            ]
        }
    }
)

    // Smithery 배포를 위해 MCP 서버 객체 반환
    // Smithery는 McpServer 인스턴스의 server 속성을 사용합니다
    // 참고: 일부 경우에는 server 인스턴스 자체를 반환해야 할 수도 있습니다
    return server.server
}
