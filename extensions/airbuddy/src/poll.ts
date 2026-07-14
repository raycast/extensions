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
