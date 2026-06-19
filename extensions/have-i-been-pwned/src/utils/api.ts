import { getPreferenceValues } from "@raycast/api";

const HIBP_BASE_URL = "https://haveibeenpwned.com/api/v3";
const PWNED_PASSWORDS_BASE_URL = "https://api.pwnedpasswords.com";
const USER_AGENT = "have-i-been-pwned-raycast";

export class HibpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "HibpError";
  }
}

function getErrorMessage(status: number, retryAfter?: string): string {
  switch (status) {
    case 400:
      return "Bad request. Please check your input.";
    case 401:
      return "API key missing or invalid. Add your HIBP API key in preferences.";
    case 403:
      return "Forbidden. Verify your API key is active at haveibeenpwned.com/API/Key.";
    case 429:
      return `Rate limit exceeded. Please try again${retryAfter ? ` after ${retryAfter} seconds` : " later"}.`;
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return `Unexpected error (HTTP ${status}).`;
  }
}

export async function hibpFetch<T>(path: string, requireKey = true): Promise<T | null> {
  const { apiKey } = getPreferenceValues<Preferences>();

  if (requireKey && !apiKey) {
    throw new HibpError("API key missing. Add your HIBP API key in preferences.", 401);
  }

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
  };

  if (apiKey) {
    headers["hibp-api-key"] = apiKey;
  }

  const response = await fetch(`${HIBP_BASE_URL}${path}`, { headers });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after") ?? undefined;
    throw new HibpError(getErrorMessage(response.status, retryAfter), response.status);
  }

  return response.json() as Promise<T>;
}

export async function pwnedPasswordsFetch(prefix: string): Promise<string> {
  const { paddingEnabled } = getPreferenceValues<Preferences>();

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
  };

  if (paddingEnabled) {
    headers["Add-Padding"] = "true";
  }

  const response = await fetch(`${PWNED_PASSWORDS_BASE_URL}/range/${prefix}`, { headers });

  if (!response.ok) {
    throw new HibpError(getErrorMessage(response.status), response.status);
  }

  return response.text();
}
