import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "970e228eb486f7473a93ae59b7a5201f4e89af09286e0097510e36d1826125bf";
const scope =
  "assets:read assets:write cms:read cms:write forms:read forms:write pages:read pages:write sites:read sites:write custom_code:read custom_code:write authorized_user:read";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Webflow",
  providerIcon: "webflow-logo.png",
  description: "Connect your Webflow account to Raycast.",
});

export async function isAuthorized(): Promise<boolean> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    return tokenSet?.accessToken.length > 0;
  }
  return false;
}

export async function authorize(): Promise<string> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    return tokenSet.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://webflow.com/oauth/authorize",
    clientId: clientId,
    scope: scope,
    extraParameters: {
      redirect_uri: "https://www.raycast.com/redirect/extension",
      response_type: "code",
    },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", "fd641cc3acd88a36ced1a976f40d092ef658af16ff065f1dca4f8a25b47b1d2b");
  params.append("code", authCode);
  params.append("redirect_uri", "https://www.raycast.com/redirect/extension");
  params.append("grant_type", "authorization_code");

  const response = await fetch("https://api.webflow.com/oauth/access_token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

export async function logout() {
  await oauthClient.removeTokens();
}
