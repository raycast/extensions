import { ATTRIBUTION_HEADER, attributionValue } from './attribution.js'
import { resolveBaseUrl } from './config.js'
import { ModelflareError, errorFromResponse } from './errors.js'

export interface ClientOptions {
  apiKey: string
  /** `global`, `china`, or a custom URL. Defaults to `global`. */
  baseUrl?: string
  /** Attribution slug such as `modelflare-vscode`. */
  plugin: string
  /** Plugin release version, injected at build time. */
  version: string
  fetch?: typeof fetch
  /** Per-request timeout. Defaults to 120 seconds. */
  timeoutMs?: number
}

export interface RequestOptions extends Omit<RequestInit, 'headers' | 'body'> {
  headers?: Record<string, string>
  /** Serialized as JSON unless it is already a string, Blob, FormData or buffer. */
  body?: unknown
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 120_000

type RawBody = NonNullable<RequestInit['body']>

function isRawBody(body: unknown): body is RawBody {
  return (
    typeof body === 'string' ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
  )
}

function combineSignals(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!signal) return timeout
  return AbortSignal.any([signal, timeout])
}

/**
 * Minimal Modelflare HTTP client. Every request carries the bearer key and the
 * plugin's `X-Modelflare-Skill` attribution; failures become
 * {@link ModelflareError} without ever echoing the key.
 */
export class ModelflareClient {
  readonly baseUrl: string
  readonly attribution: string
  readonly #apiKey: string
  readonly #fetch: typeof fetch
  readonly #timeoutMs: number

  constructor(options: ClientOptions) {
    const apiKey = options.apiKey.trim()
    if (apiKey === '') throw new TypeError('A Modelflare API key is required')
    this.#apiKey = apiKey
    this.baseUrl = resolveBaseUrl(options.baseUrl)
    this.attribution = attributionValue(options.plugin, options.version)
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  /**
   * Headers for hosts that send requests through their own OpenAI-compatible
   * client. Pass them as that client's default headers.
   */
  headers(extra?: Record<string, string>): Record<string, string> {
    return {
      ...extra,
      Authorization: `Bearer ${this.#apiKey}`,
      [ATTRIBUTION_HEADER]: this.attribution,
    }
  }

  /** Attribution header alone, for hosts that inject the key themselves. */
  attributionHeaders(): Record<string, string> {
    return { [ATTRIBUTION_HEADER]: this.attribution }
  }

  url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/u, '')}`
  }

  /** Sends a request and throws {@link ModelflareError} for any non-2xx status. */
  async request(path: string, options: RequestOptions = {}): Promise<Response> {
    const { headers, body, timeoutMs, signal, ...init } = options
    const finalHeaders = this.headers(headers)
    let finalBody: RawBody | undefined
    if (body !== undefined) {
      if (isRawBody(body)) {
        finalBody = body
      } else {
        finalBody = JSON.stringify(body)
        finalHeaders['Content-Type'] ??= 'application/json'
      }
    }
    const requestTimeout = timeoutMs ?? this.#timeoutMs
    let response: Response
    try {
      response = await this.#fetch(this.url(path), {
        ...init,
        headers: finalHeaders,
        ...(finalBody !== undefined ? { body: finalBody } : {}),
        signal: combineSignals(signal, requestTimeout),
      })
    } catch (error) {
      if (signal?.aborted) throw error
      const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
      throw new ModelflareError(
        {
          kind: timedOut ? 'timeout' : 'network',
          message: timedOut ? `Request timed out after ${requestTimeout} ms` : 'Could not reach Modelflare',
        },
        { cause: error },
      )
    }
    if (!response.ok) throw await errorFromResponse(response)
    return response
  }

  async json<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(path, options)
    return (await response.json()) as T
  }
}
