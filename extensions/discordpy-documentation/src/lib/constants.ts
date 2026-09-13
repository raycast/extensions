import { getPreferences } from "./preferences";

export const CACHE_SCHEMA = "v3";

export function docsVersion(): string {
  return getPreferences().docsVersion;
}

export function docsBase(): string {
  return `https://discordpy.readthedocs.io/en/${docsVersion()}/`;
}

export const REQUEST_TIMEOUT = 15000;

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT);
}
