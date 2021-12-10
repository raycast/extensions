export async function waitUntil<T>(
  promise: Promise<T> | (() => Promise<T>),
  options?: { timeout?: number; timeoutMessage: string }
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(async () => {
      reject(new Error(options?.timeoutMessage ?? "Timed out"));
    }, options?.timeout ?? 3000);
  });

  const unwrappedPromise = promise instanceof Function ? promise() : promise;
  return await Promise.race([unwrappedPromise, timeout]);
}
