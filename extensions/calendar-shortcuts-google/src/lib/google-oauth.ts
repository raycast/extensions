import { OAuthService } from "@raycast/utils";

export const googleOAuth = OAuthService.google({
  clientId:
    "737197651194-vg864okj13cpnp6chc7tsmag8paof79h.apps.googleusercontent.com",
  scope:
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly",
});
