import { getPreferenceValues, OAuth } from "@raycast/api";
import { createCustomStravaProvider } from "./custom-auth";

const preferences = getPreferenceValues<Preferences>();
const clientId = preferences.strava_client_id?.trim() ?? "";
const clientSecret = preferences.strava_client_secret?.trim() ?? "";
export const hasStravaCredentials = Boolean(clientId && clientSecret);

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Strava",
  providerIcon: "strava-logo.svg",
  providerId: `strava-custom-${clientId || "unconfigured"}`,
  description: "Connect your Strava account to view and manage your workouts.",
});

// Retire the old shared app's local login so Raycast no longer reports it as
// connected. This never revokes or removes a personal app's tokens.
const legacyClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Strava",
  providerId: "strava",
});
const personalProvider = createCustomStravaProvider(client, clientId, clientSecret);

export const provider = {
  client,
  async authorize() {
    if (await legacyClient.getTokens()) await legacyClient.removeTokens();
    return personalProvider.authorize();
  },
};
