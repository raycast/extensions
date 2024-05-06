import { OAuth } from "@raycast/api";

export const clientId = "1027777289546-dqcvms1bih7g1d0v6nu88fieavd1ku31.apps.googleusercontent.com";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerId: "google",
  description: "Connect your Google account\n(Raycast Extension Demo)",
});
