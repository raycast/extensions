/**
 * The "log in with vvd" device flow, as the CLI does it: start a request, send
 * the person to `/connect?code=…`, poll until they approve, receive a
 * `vvd_live_` key exactly once. The HTTP calls are injected so this stays pure
 * and unit-tested with node --test.
 */

export interface ConnectStart {
  userCode: string
  deviceCode: string
  verificationUrl: string
  verificationUrlComplete: string
  /** Seconds until the code expires. */
  expiresIn: number
  /** Suggested polling interval, seconds. */
  interval: number
}

export type PollOutcome =
  | { status: "pending" }
  | { status: "approved"; key: string; keyId: string | null }
  | { status: "denied" }
  | { status: "expired" }

/**
 * Parse a `POST /api/cli/connect/start` body (defensive; throws on nonsense).
 *
 * The approval URLs are built from `origin` — the host the extension just
 * called — never from the response. Behind a proxy a server can only guess its
 * public origin, and the first live run of this flow was sent to
 * `http://0.0.0.0:8080/connect` (the server's bind address). The extension
 * knows where it sent the request; that is the one origin it can trust.
 */
export function parseConnectStart(json: unknown, origin: string): ConnectStart {
  const rec =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {}
  const userCode = typeof rec.userCode === "string" ? rec.userCode : ""
  const deviceCode = typeof rec.deviceCode === "string" ? rec.deviceCode : ""
  if (!userCode || !deviceCode) {
    throw new Error("vvd didn't start a connect request")
  }
  const base = origin.replace(/\/+$/, "")
  return {
    userCode,
    deviceCode,
    verificationUrl: `${base}/connect`,
    verificationUrlComplete: `${base}/connect?code=${encodeURIComponent(userCode)}`,
    expiresIn: typeof rec.expiresIn === "number" ? rec.expiresIn : 600,
    interval: typeof rec.interval === "number" ? rec.interval : 3,
  }
}

/**
 * Parse a `POST /api/cli/connect/poll` response. The route speaks the OAuth
 * device-flow vocabulary (`authorization_pending` 202 / `access_denied` 403 /
 * `expired_token` 410) and answers `{ access_token }` exactly once.
 */
export function parsePollResponse(status: number, json: unknown): PollOutcome {
  const rec =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {}
  if (typeof rec.access_token === "string" && rec.access_token) {
    return {
      status: "approved",
      key: rec.access_token,
      keyId: typeof rec.key_id === "string" ? rec.key_id : null,
    }
  }
  if (status === 403 || rec.status === "access_denied")
    return { status: "denied" }
  if (status === 410 || rec.status === "expired_token")
    return { status: "expired" }
  return { status: "pending" }
}

export interface WaitOptions {
  /** Milliseconds between polls. */
  intervalMs: number
  /** Give up after this many milliseconds, whatever the server says. */
  deadlineMs: number
  sleep: (ms: number) => Promise<void>
  signal?: AbortSignal
  now?: () => number
}

export type WaitResult =
  | { status: "approved"; key: string; keyId: string | null }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "cancelled" }
  | { status: "error"; message: string }

/** Consecutive poll failures before the flow gives up and shows the last error. */
export const MAX_CONSECUTIVE_POLL_FAILURES = 5

/**
 * Poll until the request resolves. One failed poll (a network blip, a rate
 * limit) is retried on the next tick — the person is busy approving in a
 * browser and would not know why the window gave up. Failures that keep
 * coming are a real problem, and the last one's message is what to show.
 */
export async function waitForApproval(
  poll: () => Promise<PollOutcome>,
  options: WaitOptions,
): Promise<WaitResult> {
  const now = options.now ?? (() => Date.now())
  const deadline = now() + options.deadlineMs
  let failures = 0
  while (true) {
    if (options.signal?.aborted) return { status: "cancelled" }
    if (now() >= deadline) return { status: "expired" }
    let outcome: PollOutcome | null = null
    try {
      outcome = await poll()
      failures = 0
    } catch (err) {
      failures += 1
      if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        return {
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        }
      }
    }
    if (outcome && outcome.status !== "pending") return outcome
    await options.sleep(options.intervalMs)
  }
}
