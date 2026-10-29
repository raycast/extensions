import type { OperationResult } from "./types";

export interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  /**
   * What we were waiting for, phrased for a human. Every timeout otherwise produces the same
   * generic string across six different postconditions, so the message a user copies out of a
   * failure toast can't distinguish "the AirPods never connected" from "Spatial Audio never
   * flipped." Pass something specific.
   */
  description?: string;
}

export class PollTimeoutError extends Error {
  constructor(message = "Timed out waiting for AirBuddy to settle.") {
    super(message);
    this.name = "PollTimeoutError";
  }
}

/**
 * AirBuddy's action commands return when the request is ACCEPTED, not when Bluetooth settles.
 * Never report success on the return of an action — poll the postcondition instead.
 */
export async function pollUntil<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  opts: PollOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const intervalMs = opts.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const value = await read();
    if (done(value)) return value;

    if (Date.now() >= deadline) {
      const seconds = Math.round(timeoutMs / 1000);
      throw new PollTimeoutError(
        opts.description
          ? `AirBuddy accepted the request, but ${opts.description} within ${seconds}s.`
          : `Timed out after ${seconds}s waiting for AirBuddy to settle.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Thrown when AirBuddy's `operation result` reports the operation did NOT apply — `rejected`,
 * `failed`, or `cancelled`. `result.reason` is AirBuddy's own human-readable explanation ("The
 * device is not connected.", "The device must be connected before its listening mode can be
 * changed.") — always more accurate than a generic 10s-timeout message, since AirBuddy told us
 * directly why, instead of us inferring it from a postcondition that never arrived.
 */
export class OperationRejectedError extends Error {
  readonly result: OperationResult;
  constructor(result: OperationResult) {
    super(result.reason ?? `AirBuddy reported the operation as "${result.outcome}".`);
    this.name = "OperationRejectedError";
    this.result = result;
  }
}

/**
 * NEW in AirBuddy 912: `connect device`, `disconnect device`, `set/toggle listening mode`, and the
 * headset-shortcut connect/disconnect commands all now return `operation result` — live-verified
 * retrievable via JXA (2026-07-22), reversing the 911 migration's "confirmed unreachable" finding.
 *
 * Fail fast on `rejected`/`failed`/`cancelled`: AirBuddy already told us the operation didn't
 * apply, so polling toward a postcondition it explicitly said won't happen just burns the full
 * timeout before reporting a worse, generic message. Throws `OperationRejectedError` in that case
 * — callers should catch it same as any other command error (showFailure reads `.message`).
 *
 * On `applied`, callers still decide whether to poll: `operation result` reflects the completed
 * Bluetooth/audio-level operation, which is not always identical to the UI-visible settle state
 * this codebase polls for (e.g. `getOutputDevice()` reflecting the new route). Most call sites
 * still poll after a passing check here — this only removes the guaranteed-wasted wait on results
 * we already know won't materialize.
 */
export function assertApplied(result: OperationResult): void {
  if (!result.applied) {
    throw new OperationRejectedError(result);
  }
}
