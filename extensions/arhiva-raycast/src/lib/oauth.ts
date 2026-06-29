import { environment, OAuth } from "@raycast/api";

export const raycastAuthClient = new OAuth.PKCEClient({
  redirectMethod: environment.isDevelopment ? OAuth.RedirectMethod.App : OAuth.RedirectMethod.Web,
  providerName: "arhiva",
  providerIcon: "icon.png",
  providerId: "arhiva",
  description: "Connect Raycast to your arhiva account through the web app.",
});
