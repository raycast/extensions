/**
 * The platform API's one error envelope — `{ error, code?, details? }` from
 * `@vvd/sdk/contract` — turned into something a Raycast view can act on.
 * Pure: no Raycast imports, unit-tested with node --test.
 */

/** The codes the extension reacts to; the API has more (see @vvd/sdk/contract). */
export type KnownErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "UPGRADE_REQUIRED"
  | "INVALID_BODY"

export class VvdApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly details: Record<string, unknown> | undefined

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "VvdApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Thrown before any request: there is no key to send. */
export class NotConnectedError extends Error {
  constructor() {
    super(
      "Connect your account first — run the Connect Account command or paste an API key in the extension preferences.",
    )
    this.name = "NotConnectedError"
  }
}

/** Read the envelope out of a non-2xx response body (defensive; never throws). */
export function errorFromResponse(status: number, json: unknown): VvdApiError {
  const rec =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {}
  const message =
    typeof rec.error === "string" && rec.error
      ? rec.error
      : `The vvd API answered ${status}`
  const code = typeof rec.code === "string" ? rec.code : undefined
  const details =
    rec.details && typeof rec.details === "object"
      ? (rec.details as Record<string, unknown>)
      : undefined
  return new VvdApiError(message, status, code, details)
}

export type ErrorKind =
  | "not-connected"
  | "upgrade"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "invalid"
  | "offline"
  | "unknown"

export interface DescribedError {
  kind: ErrorKind
  title: string
  message: string
}

/**
 * What to tell the person, and which recovery action fits. An expired or revoked
 * key reads as `not-connected` (reconnect), a free-plan world as `upgrade`
 * (open pricing), a fetch failure as `offline` (retry).
 */
export function describeError(err: unknown): DescribedError {
  if (err instanceof NotConnectedError) {
    return {
      kind: "not-connected",
      title: "Not connected to vvd",
      message: err.message,
    }
  }
  if (err instanceof VvdApiError) {
    if (err.status === 401 || err.code === "NOT_AUTHENTICATED") {
      return {
        kind: "not-connected",
        title: "vvd didn't accept the key",
        message:
          "It may have been revoked. Run Connect Account again, or paste a fresh key in the extension preferences.",
      }
    }
    if (err.code === "UPGRADE_REQUIRED") {
      return {
        kind: "upgrade",
        title: "This world needs Pro",
        message:
          "Reading and editing a world's content from outside the app is part of the Pro and Studio plans.",
      }
    }
    if (err.status === 429) {
      return {
        kind: "rate-limited",
        title: "Slow down a moment",
        message:
          "The vvd API rate limit was reached. It resets within a minute.",
      }
    }
    if (err.status === 403 || err.code === "NOT_AUTHORIZED") {
      return {
        kind: "forbidden",
        title: "You can't do that here",
        message: err.message,
      }
    }
    if (err.status === 404 || err.code === "NOT_FOUND") {
      return { kind: "not-found", title: "Not found", message: err.message }
    }
    if (err.status === 400 || err.code === "INVALID_BODY") {
      return {
        kind: "invalid",
        title: "vvd refused that",
        message: err.message,
      }
    }
    return {
      kind: "unknown",
      title: "vvd answered with an error",
      message: err.message,
    }
  }
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return {
      kind: "offline",
      title: "Couldn't reach vvd",
      message:
        "Check your connection and the vvd origin in the extension preferences.",
    }
  }
  const message = err instanceof Error ? err.message : String(err)
  return { kind: "unknown", title: "Something went wrong", message }
}
