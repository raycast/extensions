/**
 * Start optional persistence without putting it in the primary action's path.
 *
 * The caller still stays alive until the side effect settles, but the action
 * runs immediately and a synchronous or asynchronous side-effect failure is
 * ignored. A primary-action failure remains visible to its caller.
 */
export async function runWithBestEffortSideEffect(
  action: () => Promise<void>,
  sideEffect: () => Promise<unknown>,
): Promise<void> {
  const pending = Promise.resolve()
    .then(sideEffect)
    .catch(() => undefined);
  try {
    await action();
  } finally {
    await pending;
  }
}
