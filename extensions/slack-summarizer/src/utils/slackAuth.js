import { OAuthService } from "@raycast/utils";
import { App } from "@slack/bolt";

const slackOAuth = OAuthService.slack({
  scope: [
    "channels:read",
    "channels:history",
    "groups:read",
    "groups:history",
    "im:read",
    "im:history",
    "mpim:read",
    "mpim:history",
    "users:read",
  ].join(","),
});

let cachedApp;

/**
 * Get a Bolt App wired to Raycast-OAuth tokens.
 * This is a singleton, so it will only create the app once.
 */
export async function getSlackApp() {
  if (cachedApp) return cachedApp;

  const accessToken = await slackOAuth.authorize(); // PKCE flow
  cachedApp = new App({
    token: accessToken, // OAuth access token
    signingSecret: "dummy", // never used, but Bolt requires it
    // No receiver / no socketMode – we’re just using App.client
  });
  return cachedApp;
}
