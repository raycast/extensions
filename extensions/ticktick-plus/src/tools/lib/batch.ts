/**
 * Prefix a preparation failure with the item's position in the batch. Validation helpers
 * that are shared with single-item paths (date parsing, project lookup) do not know their
 * position, so this keeps every preparation error pointing at the item that caused it.
 */
export function withContext<T>(context: string, prepare: () => T): T {
  if (!context) return prepare();
  try {
    return prepare();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}${message}`, { cause: error });
  }
}

/**
 * Run prepared batch operations sequentially.
 *
 * Callers validate and prepare the whole batch before calling this, so a locally
 * detectable problem never leaves earlier items persisted. A *remote* failure midway
 * cannot be prevented, so the error reports what may already be written — otherwise the
 * model sees a plain error and retries the batch, duplicating the applied work.
 *
 * The failing operation itself is reported as *possibly* applied: a lost or timed-out
 * response is indistinguishable from a rejected one, and TickTick has no idempotency key
 * to disambiguate, so a retry of that item can duplicate it.
 */
export async function runBatch<T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const done: R[] = [];
  for (const item of items) {
    try {
      done.push(await run(item));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const applied =
        done.length === 0
          ? `Operation 1 of ${items.length} may or may not have been applied.`
          : `${done.length} of ${items.length} operations were already applied, and operation ${done.length + 1} may or may not have been.`;
      throw new Error(
        `${message} — ${applied} Do not retry blindly; re-check the current state first.`,
        // Keep the underlying API error (status, stack, custom fields) for diagnostics.
        { cause: error },
      );
    }
  }
  return done;
}
