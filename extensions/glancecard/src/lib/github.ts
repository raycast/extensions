// GitHub access: Raycast's GitHub sign-in, or a personal access token from the preferences.
// Every request goes through glancecard's own client, so the cards read GitHub exactly as the
// Action does.
import { getPreferenceValues } from "@raycast/api";
import { OAuthService, getAccessToken } from "@raycast/utils";
import { createClient, type Client } from "glancecard";

const preferences = getPreferenceValues<Preferences>();

// Public data only: the cards are built to be published, and glancecard refuses private
// repositories unless told otherwise.
export const github = OAuthService.github({
  personalAccessToken: preferences.personalAccessToken || undefined,
  scope: "read:user",
});

let client: Client | null = null;
let viewer: Promise<string> | null = null;

export function gh(): Client {
  if (!client) client = createClient({ token: getAccessToken().token, userAgent: "glancecard-raycast" });
  return client;
}

/** The login of whoever signed in: "mine" is decided against it, never against a setting. */
export function viewerLogin(): Promise<string> {
  if (!viewer) {
    viewer = gh()
      .graphql<{ viewer: { login: string } }>("query { viewer { login } }")
      .then((d) => d.viewer.login)
      .catch((error) => {
        viewer = null;
        throw error;
      });
  }
  return viewer;
}

export const sameLogin = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A REST read that answers null on a 404, the way "is it there?" questions want it. */
export async function restOrNull<T>(path: string): Promise<T | null> {
  try {
    return (await gh().rest<T>(path)).data;
  } catch (error) {
    if (error instanceof Error && /HTTP 404\b/.test(error.message)) return null;
    throw error;
  }
}

/** The time zone the calendar and the rhythm are read in: the preference, or this Mac's. */
export function timeZone(): string {
  const mac = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zone = preferences.timeZone?.trim();
  if (!zone) return mac;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    // "Rome" is no IANA zone: the Mac's, rather than a command that cannot open.
    return mac;
  }
}

export const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const REPOSITORY = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

/** "https://github.com/owner/name", "owner/name/", " owner/name " → "owner/name", or null. */
export function parseRepository(text: string): string | null {
  const full = text
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  return REPOSITORY.test(full) ? full : null;
}

/** "@login", "https://github.com/login" → "login", or null. */
export function parseLogin(text: string): string | null {
  const login = text
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
  return LOGIN.test(login) ? login : null;
}
