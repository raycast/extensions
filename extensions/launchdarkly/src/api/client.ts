import { getPreferenceValues } from "@raycast/api";

export const LD_API_VERSION = "20240415";

// `Preferences` is the global type generated from package.json into raycast-env.d.ts.

export function getBaseUrl(): string {
  const { ldApiUrl } = getPreferenceValues<Preferences>();
  return (ldApiUrl?.trim() || "https://app.launchdarkly.com").replace(/\/+$/, "");
}

export function getDefaultProjectKey(): string {
  return getPreferenceValues<Preferences>().projectKey?.trim() || "default";
}

export function getApiToken(): string {
  return getPreferenceValues<Preferences>().apiToken?.trim() ?? "";
}

export function ldHeaders(): Record<string, string> {
  return {
    Authorization: getApiToken(),
    "ld-api-version": LD_API_VERSION,
  };
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Build an absolute API URL, skipping undefined params. */
export function ldUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${getBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export class LDApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LDApiError";
  }
}

/** Convert a non-2xx response into a readable error. */
export async function throwForResponse(response: Response): Promise<never> {
  let apiMessage = "";
  try {
    const body = (await response.json()) as { message?: string; code?: string };
    apiMessage = body.message ?? body.code ?? "";
  } catch {
    // Non-JSON body; fall through to the status-based message.
  }

  const friendly: Record<number, string> = {
    401: "Invalid API token. Check the extension preferences.",
    403: "The API token does not have permission for this resource.",
    404: "Not found. Check the project key in the extension preferences.",
    429: "Rate limited by LaunchDarkly. Please retry in a moment.",
  };
  const message = friendly[response.status] ?? `LaunchDarkly returned HTTP ${response.status}`;
  throw new LDApiError(response.status, apiMessage ? `${message} (${apiMessage})` : message);
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) await throwForResponse(response);
  return (await response.json()) as T;
}

export async function ldFetch<T>(path: string, params?: QueryParams): Promise<T> {
  const response = await fetch(ldUrl(path, params), { headers: ldHeaders() });
  return parseJsonResponse<T>(response);
}

interface PaginatedPage<T> {
  items?: T[];
  _links?: { next?: { href: string } };
}

/** Upper bound on pages followed, so a misbehaving `next` link cannot loop forever. */
const MAX_PAGES = 50;

/**
 * Fetch every item of a paginated collection by following `_links.next`.
 * `next.href` is a path relative to the API origin (`/api/v2/...?offset=...`).
 */
export async function ldFetchAll<T>(path: string, params?: QueryParams): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = ldUrl(path, params);

  for (let page = 0; next && page < MAX_PAGES; page++) {
    const response = await fetch(next, { headers: ldHeaders() });
    const body: PaginatedPage<T> = await parseJsonResponse<PaginatedPage<T>>(response);
    items.push(...(body.items ?? []));
    const href = body._links?.next?.href;
    next = href ? new URL(href, getBaseUrl()).toString() : undefined;
  }

  return items;
}
