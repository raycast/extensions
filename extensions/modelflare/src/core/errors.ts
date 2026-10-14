export type ErrorKind =
  | 'unauthorized'
  | 'insufficient_quota'
  | 'model_not_found'
  | 'unsupported_endpoint'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'upstream'

export interface ModelflareErrorDetails {
  kind: ErrorKind
  message: string
  status?: number
  code?: string
  requestId?: string
  retryAfterSeconds?: number
}

export class ModelflareError extends Error {
  readonly kind: ErrorKind
  readonly status: number | undefined
  readonly code: string | undefined
  readonly requestId: string | undefined
  readonly retryAfterSeconds: number | undefined

  constructor(details: ModelflareErrorDetails, options?: { cause?: unknown }) {
    super(details.message, options)
    this.name = 'ModelflareError'
    this.kind = details.kind
    this.status = details.status
    this.code = details.code
    this.requestId = details.requestId
    this.retryAfterSeconds = details.retryAfterSeconds
  }
}

export function isModelflareError(value: unknown): value is ModelflareError {
  return value instanceof ModelflareError
}

// common.MessageWithRequestId appends " (request id: <id>)" to gateway messages.
const REQUEST_ID_SUFFIX = /\s*\(request id: ([^)]+)\)\s*$/u

function readErrorBody(body: unknown): { message?: string; code?: string } {
  if (!body || typeof body !== 'object') return {}
  const error = (body as { error?: unknown }).error
  if (error && typeof error === 'object') {
    const { message, code } = error as { message?: unknown; code?: unknown }
    return {
      ...(typeof message === 'string' ? { message } : {}),
      ...(typeof code === 'string' && code !== '' ? { code } : {}),
    }
  }
  const message = (body as { message?: unknown }).message
  return typeof message === 'string' ? { message } : {}
}

function kindFor(status: number, code: string | undefined): ErrorKind {
  // The code is authoritative: model_not_found arrives as 503 when no group
  // serves the model and as 404 when the model was retired.
  switch (code) {
    case 'insufficient_user_quota':
      return 'insufficient_quota'
    case 'model_not_found':
      return 'model_not_found'
    case 'unsupported_endpoint':
      return 'unsupported_endpoint'
    case 'rate_limit_exceeded':
      return 'rate_limited'
  }
  if (status === 401) return 'unauthorized'
  if (status === 429) return 'rate_limited'
  return 'upstream'
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

/** Converts a non-2xx gateway response into a {@link ModelflareError}. */
export async function errorFromResponse(response: Response): Promise<ModelflareError> {
  let body: unknown
  const text = await response.text().catch(() => '')
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    body = undefined
  }
  const parsed = readErrorBody(body)
  let message = parsed.message ?? (response.statusText || `HTTP ${response.status}`)
  let requestId = response.headers.get('x-request-id') ?? undefined
  const suffix = REQUEST_ID_SUFFIX.exec(message)
  if (suffix) {
    requestId = suffix[1]
    message = message.slice(0, suffix.index)
  }
  const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'))
  return new ModelflareError({
    kind: kindFor(response.status, parsed.code),
    message,
    status: response.status,
    ...(parsed.code ? { code: parsed.code } : {}),
    ...(requestId ? { requestId } : {}),
    ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
  })
}

/** Errors that a client may retry on its own. model_not_found is never one. */
export function isRetryable(error: ModelflareError): boolean {
  return error.kind === 'rate_limited' || error.kind === 'timeout' || error.kind === 'network'
}
