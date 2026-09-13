import { OAuth } from "@raycast/api";
import { GrokClient, TokenStore } from "./core/client";

export const tokenClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Cursor · Grok Bot",
  providerId: "grok-bot",
});
export const tokenStore: TokenStore = {
  async read() {
    const tokens = await tokenClient.getTokens();
    return tokens?.accessToken && tokens.refreshToken
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : undefined;
  },
  async write(tokens) {
    await tokenClient.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },
};
export const client = new GrokClient(tokenStore);
