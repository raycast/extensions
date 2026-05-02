import { environment } from "@raycast/api";

export const SEARCH_DEBUG_ENV_KEY = "VOYAGER_SEARCH_DEBUG";

export function isSearchDebugEnabled(): boolean {
  return environment.isDevelopment === true || process.env[SEARCH_DEBUG_ENV_KEY] === "1";
}

export function logSearchDebug(event: string, payload?: unknown): void {
  if (!isSearchDebugEnabled()) {
    return;
  }

  if (payload === undefined) {
    console.log(`[search-debug] ${event}`);
    return;
  }

  console.log(`[search-debug] ${event}`, payload);
}
