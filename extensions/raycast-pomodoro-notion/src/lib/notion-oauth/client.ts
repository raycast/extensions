import { OAuth } from "@raycast/api";

export const notionOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerId: "pomonotion",
  providerIcon: "icon.png",
  description: "Connect your Notion account to save Pomodoro work logs.",
});
