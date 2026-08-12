import { OAuthService } from "@raycast/utils";

/**
 * Google OAuth (PKCE) for this extension.
 *
 * - OAuth client in Google Cloud Console must be Application type "iOS"
 *   with Bundle ID "com.raycast" — that's what lets this run without a
 *   client secret. A "Desktop app" or "Web application" client type will
 *   NOT work with Raycast's PKCE flow the same way.
 * - The consent screen audience must be "External" so any Google Workspace
 *   user can authenticate, not just one organization.
 * - Scopes requested: calendar.readonly (check room availability) and
 *   calendar.events (create the Room Block event), plus the Admin SDK
 *   Directory API scope below, used only as an optional automatic room
 *   discovery step for orgs where the signed-in account has Workspace admin
 *   rights (see onboarding.tsx's tryDirectoryApi). Everyone else falls back
 *   to a calendar-history scan or manual entry.
 */
export const google = OAuthService.google({
  clientId:
    "556180145943-ft2oe0avkfgon97h77q2fjvlmjmnnuco.apps.googleusercontent.com",
  scope:
    "https://www.googleapis.com/auth/calendar.readonly " +
    "https://www.googleapis.com/auth/calendar.events " +
    "https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly",
});
