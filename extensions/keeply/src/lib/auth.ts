import { OAuth } from "@raycast/api";

const APP_URL = "https://app.keeply.tools";
const API_URL = "https://api.keeply.tools";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Keeply",
  providerIcon: "keeply-icon.png",
  description: "Connect your Keeply account to access your bookmarks.",
});

export async function authorize(): Promise<string> {
  const existingTokens = await oauthClient.getTokens();
  if (existingTokens?.accessToken) {
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${APP_URL}/oauth/authorize`,
    clientId: "raycast",
    scope: "",
    extraParameters: { code_challenge_method: "S256" },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokenSet = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokenSet);

  return tokenSet.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, code: string): Promise<OAuth.TokenResponse> {
  const res = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      codeVerifier: authRequest.codeVerifier,
      clientId: "raycast",
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Authentication failed (${res.status})`);
  }

  const data = (await res.json()) as { accessToken: string };
  return { access_token: data.accessToken };
}
