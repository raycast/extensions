/**
 * Run prepared batch operations sequentially.
 *
 * Callers validate and prepare the whole batch before calling this, so a locally
 * detectable problem never leaves earlier items persisted. A *remote* failure midway
 * cannot be prevented, so the error reports how much was applied — otherwise the model
 * sees a plain error and retries the batch, duplicating the applied work.
 */
export async function runBatch<T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const done: R[] = [];
  for (const item of items) {
    try {
      done.push(await run(item));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (done.length === 0) throw new Error(message);
      throw new Error(
        `${message} — ${done.length} of ${items.length} operations were already applied. Do not retry the whole batch; re-check the current state first.`,
      );
    }
  }
  return done;
}
