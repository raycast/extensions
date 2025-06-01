import { getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { OAuthService, OnAuthorizeParams, withAccessToken } from "@raycast/utils";
import { extractSlug } from "./utils/auth.util";

const scopes = ["openid", "profile", "email", "offline_access", "manage:entities", "manage:workspaces"];
const extraParameters = {
  audience: "clarify:service",
};
const onAuthorize = async (params: OnAuthorizeParams) => {
  await LocalStorage.setItem("slug", extractSlug(params.token));
};

const clientDev = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Clarify (Dev)",
  providerIcon: "icon.png",
  providerId: "clarify-dev",
  description: "Connect your Clarify account",
});

export const oAuthDev = new OAuthService({
  client: clientDev,
  clientId: "UgjkQ9A6Ey2SNOmYP7AWQyVncvHp4dxc",
  scope: scopes.join(" "),
  authorizeUrl: "https://auth.dev.clarify.ai/authorize",
  tokenUrl: "https://auth.dev.clarify.ai/oauth/token",
  extraParameters,
  onAuthorize,
});

const clientProd = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Clarify",
  providerIcon: "icon.png",
  providerId: "clarify",
  description: "Connect your Clarify account",
});

export const oAuthProd = new OAuthService({
  client: clientProd,
  clientId: "XcByc8h1MOn8Zoo757jKAns0mQoc7xd1",
  scope: scopes.join(" "),
  authorizeUrl: "https://auth.clarify.ai/authorize",
  tokenUrl: "https://auth.clarify.ai/oauth/token",
  extraParameters,
  onAuthorize,
});

/**
 * Higher-order component to wrap withAccessToken HOC with preferred OAuth provider
 * depending on the environment.
 */
export const withAuth = (wrappedComponent: React.ComponentType) => {
  const preferences = getPreferenceValues<Preferences>();
  const oAuthProvider = preferences.environment === "prod" ? oAuthProd : oAuthDev;

  return withAccessToken(oAuthProvider)(wrappedComponent);
};
