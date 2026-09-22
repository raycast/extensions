import { environment } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";

/**
 * Thrown when a concurrent process stole the session lock after the holding
 * process's heartbeat stalled past `proper-lockfile`'s stale threshold.
 *
 * The default `onCompromised` throws from a heartbeat `setTimeout`, which is an
 * uncatchable uncaught exception. As a typed error it lets `oauth.ts` surface a
 * clean command failure (and a clean retry on the next invocation) instead.
 */
export class SessionLockCompromisedError extends Error {
  constructor(message = "Session lock was compromised by a concurrent process", options?: ErrorOptions) {
    super(message, options);
    this.name = "SessionLockCompromisedError";
  }
}

// Raycast commands run in separate processes but share supportPath and tokens.
// A filesystem lock orders refresh, login commits and logout across commands.
export async function withSessionLock<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });

  // `proper-lockfile` invokes `onCompromised` from the heartbeat `setTimeout` in
  // `updateLock`, i.e. outside any awaited promise chain. Its default is
  // `(err) => { throw err; }`, which escapes this wrapper's `try/finally` as an
  // uncaught exception and kills the command process. Route the compromise into
  // an AbortController + a deferred so a stolen lock rejects the in-flight
  // action with a typed error and aborts its abortable work (the refresh fetch)
  // rather than throwing synchronously from a timer.
  const controller = new AbortController();
  let rejectCompromised!: (err: Error) => void;
  const compromised = new Promise<never>((_, reject) => {
    rejectCompromised = reject;
  });

  const release = await lock(join(environment.supportPath, "oauth-session"), {
    realpath: false,
    retries: { retries: 100, minTimeout: 100, maxTimeout: 300 },
    onCompromised: (err) => {
      const error = new SessionLockCompromisedError(err.message, { cause: err });
      controller.abort(error);
      rejectCompromised(error);
    },
  });

  try {
    return await Promise.race([action(controller.signal), compromised]);
  } finally {
    // After a compromise `setLockAsCompromised` deletes the lock and marks it
    // released, so `release()` rejects with ERELEASED. Only suppress that
    // expected cleanup failure; other filesystem failures must remain visible.
    await release().catch((error: unknown) => {
      if (controller.signal.aborted && (error as NodeJS.ErrnoException)?.code === "ERELEASED") return;
      throw error;
    });
  }
}
