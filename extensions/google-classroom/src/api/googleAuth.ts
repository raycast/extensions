import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

let email: string | undefined;

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
  clientId: getPreferenceValues<{ clientId: string }>().clientId.trim(),
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope: SCOPES.map((scope) => `https://www.googleapis.com/auth/${scope}`).join(" "),
  onAuthorize({ idToken }) {
    email = undefined;
    if (!idToken) return;

    const { email: decodedEmail } = decodeJWT(idToken);
    email = decodedEmail;
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
