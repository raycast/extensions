import { getPreferenceValues, showToast, Toast } from "@raycast/api";

/**
 * Helpers for working with the API token stored in Raycast preferences.
 * We do a light JWT parse to check expiry so we can fail fast with
 * a clear message instead of a generic "Unauthenticated" error.
 */

type Prefs = {
  apiToken?: string;
};

export function getApiToken(): string | null {
  const prefs = getPreferenceValues<Prefs>();
  const token = prefs.apiToken?.trim();
  return token && token.length > 0 ? token : null;
}

function base64UrlDecode(segment: string): string | null {
  // Convert URL-safe base64 to standard base64
  let base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    return Buffer.from(base64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function parseJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) return null;
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function tokenIsExpired(token: string): boolean | null {
  const claims = parseJwtClaims(token);
  if (!claims) return null;
  const exp = claims["exp"];
  if (typeof exp !== "number") return null;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

/**
 * Ensure we have a non-expired token.
 *
 * Returns the token string when usable, or null when missing/expired
 * (after showing a descriptive toast to the user).
 */
export async function ensureValidTokenOrToast(): Promise<string | null> {
  const token = getApiToken();

  if (!token) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing API token",
      message: "Set your API token in the Kalpa Raycast extension preferences.",
    });
    return null;
  }

  const expired = tokenIsExpired(token);
  if (expired === true) {
    await showToast({
      style: Toast.Style.Failure,
      title: "API token expired",
      message:
        "Get a fresh token from the Kalpa web app (open /api/clerk-token) and paste it into Raycast preferences.",
    });
    return null;
  }

  // expired === false or null (couldn't determine) – in both cases we try the request.
  return token;
}
