import { showToast, ToastStyle } from "@raycast/api";

export async function showFailureToast<T>(
  error: T | Promise<T> | (() => T) | (() => Promise<T>),
  title = "Something went wrong"
) {
  if (!error) {
    return;
  }

  const unwrappedError = error instanceof Function ? error() : error;
  const resolvedError = await Promise.resolve(unwrappedError);
  const message = resolvedError
    ? resolvedError instanceof Error
      ? resolvedError.message
      : String(resolvedError)
    : undefined;

  await showToast(ToastStyle.Failure, title, message);
}

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
