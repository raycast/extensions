import { auth, calendar_v3 } from "@googleapis/calendar";
import { OAuthService, withAccessToken } from "@raycast/utils";
import type { Tool } from "@raycast/api";

// Only request the minimal scopes needed
const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
const CLIENT_ID = "690234628480-bhl8vft6dp81bkv4bq0lf9l6vv7nerq4.apps.googleusercontent.com";

let calendar: calendar_v3.Calendar | null = null;

export const googleOAuth = OAuthService.google({
  clientId: CLIENT_ID,
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope: GOOGLE_SCOPES,
  onAuthorize({ token }) {
    const oauth = new auth.OAuth2();
    oauth.setCredentials({ access_token: token });
    calendar = new calendar_v3.Calendar({ auth: oauth });
  },
});

export function getCalendarClient(): calendar_v3.Calendar {
  if (!calendar) {
    throw new Error("No Google Calendar client initialized");
  }
  return calendar;
}

export function withGoogleAPIs<Input, Output>(
  ComponentOrFn: React.ComponentType<Input> | ((params: Input) => Promise<Output> | Output) | Tool.Confirmation<Input>,
) {
  return withAccessToken<Input>(googleOAuth)(ComponentOrFn);
}
