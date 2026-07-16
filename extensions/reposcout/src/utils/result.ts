/**
 * A tiny explicit `Result` type used across layers that must never throw for
 * expected failures (filesystem permission errors, git failures, corrupted
 * caches). Callers are forced to handle the error branch rather than relying on
 * try/catch discipline. See docs/DECISIONS.md (ADR-004).
 */

export type Result<T, E = Error> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Wrap a success value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap an error value. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Run an async function, converting any thrown error into the error branch of a
 * {@link Result}. Unknown throwables are normalized to `Error` instances.
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (cause) {
    return err(cause instanceof Error ? cause : new Error(String(cause)));
  }
}
