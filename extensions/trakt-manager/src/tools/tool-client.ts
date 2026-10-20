import { initTraktClient } from "../lib/client";

export const TOOL_TIMEOUT_MS = 15000;

/** Trakt caps `limit` at 250 on paginated sync endpoints as of June 2026. */
export const TRAKT_LOOKUP_PAGE_SIZE = 250;

export const toolTraktClient = initTraktClient();

export function getToolSignal(): AbortSignal {
  return AbortSignal.timeout(TOOL_TIMEOUT_MS);
}

function assertToolSuccess<T extends { status: number; body: unknown }>(response: T, errorMessage: string): T {
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

export async function executeToolCall<T extends { status: number; body: unknown }>(
  call: (signal: AbortSignal) => Promise<T>,
  errorMessage = "Trakt API request failed",
): Promise<T> {
  return assertToolSuccess(await call(getToolSignal()), errorMessage);
}

/**
 * Same as `executeToolCall`, but a 404 is a missing resource rather than a tool failure.
 * Needed because Trakt movie and show IDs overlap: `/sync/history/shows/684` 404s while
 * `/sync/history/movies/684` is a real film.
 */
export async function executeToolCallAllowingNotFound<T extends { status: number; body: unknown }>(
  call: (signal: AbortSignal) => Promise<T>,
  errorMessage = "Trakt API request failed",
): Promise<T | undefined> {
  const response = await call(getToolSignal());
  if (response.status === 404) return undefined;
  return assertToolSuccess(response, errorMessage);
}
