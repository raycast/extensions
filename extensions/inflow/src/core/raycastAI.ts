import { AI } from "@raycast/api";
import { logger } from "./logger";
import {
  createAbortError,
  isAbortLikeError,
  isRaycastConnectionError,
} from "./requestErrors";

const MAX_RAYCAST_ATTEMPTS = 2;
const RAYCAST_RETRY_DELAY_MS = 350;

export async function askRaycastAI(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RAYCAST_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    try {
      logger.logStatus("runPrompt", `Calling Raycast AI.ask()`);
      // @ts-ignore
      return await AI.ask(prompt, { signal });
    } catch (error) {
      lastError = error;

      if (isAbortLikeError(error)) {
        throw createAbortError();
      }

      const shouldRetry =
        isRaycastConnectionError(error) && attempt < MAX_RAYCAST_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }

      logger.warn(
        `[runPrompt] Raycast AI.ask() failed to connect. Retrying (${attempt}/${MAX_RAYCAST_ATTEMPTS - 1})...`,
      );
      await delay(RAYCAST_RETRY_DELAY_MS);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
