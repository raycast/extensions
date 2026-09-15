import { initTraktClient } from "../lib/client";

export const TOOL_TIMEOUT_MS = 15000;

export const toolTraktClient = initTraktClient();

export function getToolSignal(): AbortSignal {
  return AbortSignal.timeout(TOOL_TIMEOUT_MS);
}

export async function executeToolCall<T extends { status: number; body: unknown }>(
  call: (signal: AbortSignal) => Promise<T>,
  errorMessage = "Trakt API request failed",
): Promise<T> {
  const signal = getToolSignal();
  const response = await call(signal);

  if (response.status === 401) {
    throw new Error("Authentication failed. Please check your Trakt account connection in Raycast.");
  }
  if (response.status === 404) {
    throw new Error("Requested media or resource was not found on Trakt.");
  }
  if (response.status === 420) {
    throw new Error(
      "Trakt account limit exceeded. Free accounts cap how many lists and list items you can have; delete something or upgrade to Trakt VIP.",
    );
  }
  if (response.status === 429) {
    throw new Error("Trakt rate limit exceeded. Please wait a few seconds before retrying.");
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${errorMessage} (HTTP ${response.status})`);
  }

  return response;
}
