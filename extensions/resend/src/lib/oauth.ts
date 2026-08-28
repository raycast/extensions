import { OAuth, getPreferenceValues } from "@raycast/api";
import { withAccessToken, OAuthService, WithAccessTokenComponentOrFn } from "@raycast/utils";
import { Resend } from "resend";

const { api_key } = getPreferenceValues<Preferences>();
const clientId = "161e7b77-a7ec-4cda-b186-29e2060a8d74";
let resend: Resend | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Resend",
  providerIcon: "resend-extension_icon.png",
  providerId: "resend",
  description: "Connect your Resend account",
});

const provider = new OAuthService({
  client,
  clientId: clientId,
  scope: "full_access",
  authorizeUrl: "https://api.resend.com/oauth/authorize",
  tokenUrl: "https://api.resend.com/oauth/token",
  personalAccessToken: api_key,
  onAuthorize({ token }) {
    resend = new Resend(token);
  },
});

export function withResend<T>(Component: WithAccessTokenComponentOrFn) {
  return withAccessToken<T>(provider)(Component);
}

export function getResend() {
  if (!resend) {
    throw new Error("No Resend client initialized");
  }

  return resend;
}
