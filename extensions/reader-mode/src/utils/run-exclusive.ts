/**
 * Runs `task` unless one holding the same `lock` is still running; returns whether it ran.
 *
 * The lock is a ref so it survives re-renders: a handler re-created with new state still sees
 * the run its previous version started. It's released however the task ends.
 */
export async function runExclusive(lock: { current: boolean }, task: () => Promise<void>): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  try {
    await task();
    return true;
  } finally {
    lock.current = false;
  }
}
