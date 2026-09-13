export async function withTimeout<T, TTimeout>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutResult: TTimeout,
): Promise<T | TTimeout> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<TTimeout>((resolve) => {
        timeout = setTimeout(() => resolve(timeoutResult), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
