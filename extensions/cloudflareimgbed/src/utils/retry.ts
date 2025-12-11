type RetryableFn<T> = () => Promise<T>;

export async function retry<T>(fn: RetryableFn<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isNetworkError = error instanceof TypeError && /fetch/i.test(error.message);
      if (isNetworkError) {
        break;
      }
      if (i === attempts - 1) {
        throw error;
      }
    }
  }
  throw lastError;
}
