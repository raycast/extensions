import { captureException } from "@raycast/api";

// Web API URLs carry the user's key and Steam ID, so reports name the endpoint only
const endpoint = (url: string | URL) => {
  const { origin, pathname } = new URL(url);
  return origin + pathname;
};

export const USER_AGENT = "raycast-steam (+https://www.raycast.com/KevinBatdorf/steam)";

export class SteamNetworkError extends Error {}

// A failed DNS lookup means no network at all, not a Steam outage worth reporting
const OFFLINE_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ENETUNREACH", "ENETDOWN"]);

const isOffline = (error: unknown) => {
  const code = (error as { cause?: { code?: string } } | undefined)?.cause?.code;
  return Boolean(code && OFFLINE_CODES.has(code));
};

export async function steamFetch(url: string | URL, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, ...init?.headers } });
  } catch (error) {
    if (isOffline(error)) throw new SteamNetworkError("You're offline. Check your connection and try again.");
    const message = error instanceof Error ? error.message : String(error);
    captureException(new Error(`${message}: ${endpoint(url)}`));
    throw new SteamNetworkError("Couldn't reach Steam. Try again in a moment.");
  }
  if (response.status >= 500) {
    const status = [response.status, response.statusText].filter(Boolean).join(" ");
    captureException(new Error(`${status}: ${endpoint(url)}`));
  }
  return response;
}
