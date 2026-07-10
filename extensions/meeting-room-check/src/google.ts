import { OAuthService } from "@raycast/utils";

/**
 * Google OAuth (PKCE) for this extension.
 *
 * Client setup notes (see SESSION_PRIMER.md "Solved problems" for the why):
 * - OAuth client in Google Cloud Console must be Application type "iOS"
 *   with Bundle ID "com.raycast" — that's what lets this run without a
 *   client secret. A "Desktop app" or "Web application" client type will
 *   NOT work with Raycast's PKCE flow the same way.
 * - Consent screen audience is "Internal" (Mito Workspace org only), so no
 *   Google verification review is needed.
 * - Scopes requested: calendar.readonly (check room availability) and
 *   calendar.events (create the Room Block event). No Admin SDK / Directory
 *   API scope — we're using a static room list instead (see rooms.ts),
 *   since listing resources usually needs Workspace admin rights.
 */
export const google = OAuthService.google({
  clientId:
    "556180145943-ft2oe0avkfgon97h77q2fjvlmjmnnuco.apps.googleusercontent.com",
  scope:
    "https://www.googleapis.com/auth/calendar.readonly " +
    "https://www.googleapis.com/auth/calendar.events " +
    // Lets any org (not just Mito) get an automatic room list if the
    // signed-in account happens to have Workspace admin rights — see
    // onboarding.tsx's tryDirectoryApi. Falls back to the calendar-history
    // scan or manual entry otherwise.
    "https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly " +
    // Used only to read the signed-in account's own email (via the
    // userinfo endpoint) so we can securely detect @mito.hu accounts and
    // auto-seed Ticsi's default room list — see roomStore.ts. The email
    // comes from Google's own token response, not user input, so this
    // check can't be spoofed.
    "https://www.googleapis.com/auth/userinfo.email",
});
