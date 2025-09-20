import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";

export async function waitUntil<T>(
  promise: Promise<T> | (() => Promise<T>),
  options?: { timeout?: number; timeoutMessage: string },
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(async () => {
      reject(new Error(options?.timeoutMessage ?? "Timed out"));
    }, options?.timeout ?? 6000);
  });

  const unwrappedPromise = promise instanceof Function ? promise() : promise;
  return await Promise.race([unwrappedPromise, timeout]);
}

export async function run(fn: () => Promise<string>) {
  try {
    await closeMainWindow({ clearRootSearch: true });
    const response = await fn();
    await showHUD(response);
  } catch (error) {
    await showFailureHUD(error instanceof Error ? error.message : "Something went wrong");
  }
}

async function showFailureHUD(title: string, error?: unknown) {
  await showHUD(`❌ ${title}`);
  console.error(title, error);
}

/**
 * Validates that a value is within a specified range
 *
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns A validation function that returns an error message if value is outside the range
 */
export function rangeValidator(min: number, max: number) {
  return (value?: string) => {
    if (!value) {
      return "Value is required";
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return "Value must be a number";
    }

    if (num < min || num > max) {
      return `Value must be between ${min} and ${max}`;
    }

    return undefined;
  };
}

// Default values for presets
export const DEFAULT_BRIGHTNESS = 20;
export const DEFAULT_TEMPERATURE = 50; // Midpoint between warm and cold

// Common response type for tools
export interface ToolResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Discover KeyLights with built-in retry mechanism.
 * First attempts to use cache, then falls back to forced refresh if needed.
 *
 * @param forceRefresh Whether to bypass cache and force a new discovery
 * @param maxRetries Maximum number of retries before giving up
 * @returns A KeyLight instance or throws an error
 */
export async function discoverKeyLights(forceRefresh = false, maxRetries = 3): Promise<KeyLight> {
  try {
    const keyLight = await KeyLight.discover(forceRefresh);
    if (!keyLight) {
      throw new Error("No Key Lights found");
    }
    return keyLight;
  } catch (error) {
    if (forceRefresh || maxRetries <= 0) {
      throw error;
    }
    // If initial discovery failed, try forcing a refresh
    return await discoverKeyLights(true, maxRetries - 1);
  }
}

export function formatErrorResponse(error: unknown, operation: string): ToolResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    message: `Failed to ${operation}`,
    error: errorMessage,
  };
}
