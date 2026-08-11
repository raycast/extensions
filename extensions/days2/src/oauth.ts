import { OAuthService } from "@raycast/utils";

const CLIENT_ID =
  "1069780535944-k1ikna89be4k188h70bughehhh4cfamv.apps.googleusercontent.com";

export const google = OAuthService.google({
  clientId: CLIENT_ID,
  scope: "https://www.googleapis.com/auth/calendar.readonly",
});
