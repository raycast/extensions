import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

let email: string | undefined;
const EMAIL_KEY = "account-email";

function decodeJWT(token: string): { email?: string } {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64").toString("utf-8");
  return JSON.parse(decoded);
}

const SCOPES = [
  "userinfo.email",
  "classroom.courses.readonly",
  "classroom.rosters.readonly",
  "classroom.profile.emails",
  "classroom.announcements.readonly",
  "classroom.coursework.me.readonly",
  "classroom.courseworkmaterials.readonly",
  "classroom.topics.readonly",
  // Needed to download the Drive files attached to posts
  "drive.readonly",
];

export const google = OAuthService.google({
  // The Classroom API has to be enabled in the Google Cloud project that owns the client,
  // which isn't the case for Raycast's own Google client
  clientId: getPreferenceValues<Preferences>().clientId.trim(),
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope: SCOPES.map((scope) => `https://www.googleapis.com/auth/${scope}`).join(" "),
  async onAuthorize({ idToken }) {
    // Google only sends the ID token when signing in, not when it refreshes the access token. Without
    // remembering the address, the account would become unknown an hour after signing in.
    email = idToken ? decodeJWT(idToken).email : await LocalStorage.getItem<string>(EMAIL_KEY);
    if (idToken && email) await LocalStorage.setItem(EMAIL_KEY, email);
  },
});

let pendingToken: Promise<string> | undefined;

// The token handed over by `withAccessToken` expires after an hour, which a command left open can outlive.
// `authorize` returns the stored token and refreshes it once it expired.
export function getOAuthToken(): Promise<string> {
  return (pendingToken ??= google.authorize().finally(() => (pendingToken = undefined)));
}

export function getAccountEmail(): string | undefined {
  return email;
}

// Makes Google links open with the authenticated account instead of the browser's default one
export function withAuthUser(link: string): string {
  if (!email) return link;

  const url = new URL(link);
  url.searchParams.set("authuser", email);
  return url.toString();
}
