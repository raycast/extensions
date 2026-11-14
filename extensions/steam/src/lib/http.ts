import { captureException } from "@raycast/api";
import { lookup } from "node:dns/promises";

// Web API URLs carry the user's key and Steam ID, so reports name the endpoint only
const endpoint = (url: string | URL) => {
  const { origin, pathname } = new URL(url);
  return origin + pathname;
};

export const USER_AGENT = "raycast-steam (+https://www.raycast.com/KevinBatdorf/steam)";

export class SteamNetworkError extends Error {}

const NO_NETWORK_CODES = new Set(["ENETUNREACH", "ENETDOWN"]);
const LOOKUP_CODES = new Set(["ENOTFOUND", "EAI_AGAIN"]);

// Steam's DNS can fail while the internet works, so confirm with a host Steam doesn't run
async function isOffline(error: unknown) {
  const code = (error as { cause?: { code?: string } } | undefined)?.cause?.code;
  if (!code) return false;
  if (NO_NETWORK_CODES.has(code)) return true;
  if (!LOOKUP_CODES.has(code)) return false;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(true), 3000);
  });
  try {
    return await Promise.race([
      lookup("one.one.one.one").then(
        () => false,
        () => true,
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function steamFetch(url: string | URL, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, ...init?.headers } });
  } catch (error) {
    if (await isOffline(error)) throw new SteamNetworkError("You're offline. Check your connection and try again.");
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
