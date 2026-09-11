export const SWIFT_OPERATION_TIMEOUT_MS = 5000;
export const TIMEOUT_ERROR_HUD_TITLE = "🛑 Timed out";
export const TIMEOUT_ERROR_TOAST_TITLE = "Timed out";
export const TIMEOUT_ERROR_MESSAGE = "Check Accessibility settings";

export class TimeoutError extends Error {
  constructor(operationName: string, timeoutMs: number = SWIFT_OPERATION_TIMEOUT_MS) {
    super(`${operationName} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  operationName: string,
  timeoutMs: number = SWIFT_OPERATION_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
