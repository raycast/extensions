import { OAuth, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
export const clientId = preferences.clientId;

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerId: "google",
  description: "Connect your Google account\nThis will allow you to access your Google Calendar and list events.",
});
