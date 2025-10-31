import type { z } from "zod";
import { showFailureToast } from "@raycast/utils";

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (attempt < retries) {
        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
        await delay(retryDelay);
      }
    }
  }

  throw lastError || new Error("Failed to fetch");
}

export async function fetchAndValidate<T>(url: string, schema: z.ZodType<T>, options: FetchOptions = {}): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, options);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const validated = schema.parse(data);

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Validation failed");
  }
}

export async function fetchAndValidateWithToast<T>(
  url: string,
  schema: z.ZodType<T>,
  errorTitle: string,
  options: FetchOptions = {},
): Promise<T> {
  try {
    return await fetchAndValidate(url, schema, options);
  } catch (error) {
    await showFailureToast(error, { title: errorTitle });
    throw error;
  }
}
