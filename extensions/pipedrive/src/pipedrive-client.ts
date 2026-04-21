import { assertValidPipedriveDomain, redactPipedriveSecrets } from "./pipedrive-security";

export type PipedrivePreferences = Pick<Preferences, "domain" | "apiToken">;

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function ensureLeadingSlash(pathname: string): string {
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function buildPipedriveApiUrl(
  preferences: PipedrivePreferences,
  pathname: string,
  params?: Record<string, string | number | undefined | null>,
): URL {
  const domain = assertValidPipedriveDomain(preferences.domain);
  const url = new URL(`https://${domain}${ensureLeadingSlash(pathname)}`);

  url.searchParams.set("api_token", preferences.apiToken);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      const text = String(value);
      if (text.length === 0) continue;
      url.searchParams.set(key, text);
    }
  }

  return url;
}

export function buildPipedriveWebUrl(domainInput: string, pathname: string): string {
  const domain = assertValidPipedriveDomain(domainInput);
  return `https://${domain}${ensureLeadingSlash(pathname)}`;
}

type PipedriveErrorResponse = {
  error?: string;
  error_info?: string;
};

async function parsePipedriveErrorMessage(response: Response, apiToken: string): Promise<string> {
  const statusPrefix = `HTTP ${response.status}: ${response.statusText}`;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    const message = text ? `${statusPrefix} — ${text}` : statusPrefix;
    return redactPipedriveSecrets(message, apiToken);
  }

  const json = (await response.json().catch(() => ({}))) as PipedriveErrorResponse;
  const message = [json.error, json.error_info].filter(Boolean).join(" — ");
  const fullMessage = message ? `${statusPrefix} — ${message}` : statusPrefix;
  return redactPipedriveSecrets(fullMessage, apiToken);
}

export async function fetchPipedriveJson<T>(
  preferences: PipedrivePreferences,
  url: URL | string,
  init?: RequestInit,
): Promise<T> {
  const apiToken = preferences.apiToken;

  try {
    const response = await fetch(url.toString(), init);
    if (!response.ok) {
      throw new Error(await parsePipedriveErrorMessage(response, apiToken));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(redactPipedriveSecrets(message, apiToken));
  }
}
