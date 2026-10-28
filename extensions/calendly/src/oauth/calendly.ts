import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

// Calendly issues this public identifier when the production native OAuth app is created.
// It is safe to ship in the extension; never add the accompanying client secret here.
const clientId = "vKoVfWasNguF3Ar-wouXzYL9fsRoDj09adJalzAZsh8";

export const calendlyOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Calendly",
  providerIcon: "calendly-icon.png",
  // Versioned because V2 explicitly requests scheduled_events:read and must not reuse older tokens.
  providerId: "calendly-v2",
  description: "Reconnect your Calendly account to grant meeting access in Raycast.",
});

const oauthService = new OAuthService({
  client: calendlyOAuthClient,
  clientId,
  authorizeUrl: "https://auth.calendly.com/oauth/authorize",
  tokenUrl: "https://auth.calendly.com/oauth/token",
  refreshTokenUrl: "https://auth.calendly.com/oauth/token",
  bodyEncoding: "url-encoded",
  scope: [
    "users:read",
    "event_types:read",
    "availability:read",
    "scheduled_events:read",
    "scheduled_events:write",
    "scheduling_links:write",
  ],
  extraParameters: {
    prompt: "consent",
  },
});

export function assertCalendlyOAuthConfigured() {
  if (clientId.startsWith("REPLACE_WITH_")) {
    throw new Error(
      "Calendly OAuth is not configured yet. Add the production native OAuth app client ID in src/oauth/calendly.ts.",
    );
  }
}

export const calendlyOAuth = {
  client: calendlyOAuthClient,
  async authorize() {
    assertCalendlyOAuthConfigured();
    return oauthService.authorize();
  },
};

export const calendlyOAuthRedirectUrl = "https://raycast.com/redirect?packageName=Extension";
