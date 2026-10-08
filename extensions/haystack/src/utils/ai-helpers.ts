import { captureException } from "@raycast/api";

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

export const withRetry = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2 } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      captureException(
        new Error(`AI call attempt ${attempt} failed, retrying...`, {
          cause: error,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  captureException(
    new Error(`AI call failed after ${maxAttempts} attempts`, {
      cause: lastError,
    }),
  );
  throw lastError || new Error("Unknown error in AI call");
};
