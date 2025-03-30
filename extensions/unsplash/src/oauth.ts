import { OAuth, getPreferenceValues } from "@raycast/api";

const { accessKey, secretKey } = getPreferenceValues<Preferences>();

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Unsplash",
  providerIcon: "unsplash-logo.png",
  description: "Login to your Unsplash account.",
});

export const doAuth = async () => {
  const authRequest = await client.authorizationRequest({
    endpoint: "https://unsplash.com/oauth/authorize",
    clientId: accessKey,
    scope: "public read_user write_likes",
  });

  const { authorizationCode } = await client.authorize(authRequest);

  const params = new URLSearchParams();
  params.append("client_id", accessKey);
  params.append("client_secret", secretKey);
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("code", authorizationCode);
  params.append("grant_type", "authorization_code");

  const tokenResponse = await fetch("https://unsplash.com/oauth/token", {
    method: "POST",
    body: params,
  });

  if (!tokenResponse.ok) {
    console.error("fetch tokens error:", await tokenResponse.text());
    throw new Error(tokenResponse.statusText);
  }

  await client.setTokens((await tokenResponse.json()) as OAuth.TokenResponse);
};
