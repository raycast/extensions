import { getPreferenceValues } from "@raycast/api";

export const DEFAULT_API_BASE_PATH = "https://api.plane.so";
export const DEFAULT_APP_BASE_URL = "https://app.plane.so";

/**
 * Trims whitespace and trailing slashes, and adds `https://` when the scheme is missing.
 * Falls back to `fallback` when the value is empty.
 */
export function normalizeBaseUrl(value: string | undefined | null, fallback: string): string {
  let url = (value ?? "").trim();
  if (!url) {
    url = fallback;
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

/**
 * Normalizes the API base path preference.
 * Besides trimming slashes, it strips an accidental trailing `/api` or `/api/v1`,
 * because the SDK and our request helper append `/api/v1/...` themselves.
 */
export function normalizeApiBasePath(value: string | undefined | null): string {
  return normalizeBaseUrl(value, DEFAULT_API_BASE_PATH)
    .replace(/\/api(\/v\d+)?$/i, "")
    .replace(/\/+$/, "");
}

/** Normalizes the app (web UI) base URL preference. */
export function normalizeAppBaseUrl(value: string | undefined | null): string {
  return normalizeBaseUrl(value, DEFAULT_APP_BASE_URL);
}

/** The API base path from preferences, without trailing slash and without `/api/v1`. */
export function getApiBasePath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return normalizeApiBasePath(preferences.API_BASE_PATH);
}

/** The app base URL from preferences, without trailing slash. */
export function getAppBaseUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return normalizeAppBaseUrl(preferences.APP_BASE_URL);
}

export type QueryValue = string | number | boolean | undefined | null;

export type ApiVersion = "v1" | "v2";

/**
 * Builds a v1 API URL: `{basePath}/api/v1/{path}/?query`.
 * Plane requires the trailing slash on every route.
 */
export function buildApiUrl(basePath: string, path: string, query?: Record<string, QueryValue>): string {
  return buildVersionedApiUrl(basePath, "v1", path, query);
}

/** Builds `{basePath}/api/{version}/{path}/?query`. Empty, null and undefined query values are skipped. */
export function buildVersionedApiUrl(
  basePath: string,
  version: ApiVersion,
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const cleanPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  let url = `${normalizeApiBasePath(basePath)}/api/${version}/${cleanPath}/`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const search = params.toString();
  if (search) {
    url += `?${search}`;
  }
  return url;
}

/**
 * Accepts a slug (`acme`) or a pasted Plane URL (`https://app.plane.so/acme/projects/...`)
 * and returns the workspace slug.
 */
export function normalizeWorkspaceSlug(value: string | undefined | null): string {
  const input = (value ?? "").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) {
    try {
      const [first] = new URL(input).pathname.split("/").filter(Boolean);
      return (first ?? "").trim();
    } catch {
      return "";
    }
  }
  return input.replace(/^\/+|\/+$/g, "").split("/")[0];
}
