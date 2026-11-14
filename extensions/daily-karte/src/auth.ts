import { OAuthService, getAccessToken, withAccessToken } from "@raycast/utils";
import { firebaseSession, googleOptions, readConfig } from "./lib/session";
import type { Session } from "./types";
import { APP_CONFIG } from "./service";

const config = readConfig(APP_CONFIG);
const google = OAuthService.google(googleOptions(config));
export const withGoogleAccess = withAccessToken(google);

let pending: Promise<Session> | undefined;

export async function getSession(): Promise<Session> {
  getAccessToken();
  if (pending) return pending;
  // The wrapper authenticates the root, while authorize refreshes long-lived forms through the SDK.
  pending = google.authorize().then((token) => firebaseSession(config, token));
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}
