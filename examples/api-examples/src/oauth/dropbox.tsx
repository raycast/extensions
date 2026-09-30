import { OAuth } from "@raycast/api";

// Create an OAuth app via https://www.dropbox.com/developers/apps
// As redirect URL add: https://raycast.com/redirect?packageName=Extension
// Make sure to select and save the permissions that you add via the scope request parameter
const clientId = "YourClientId";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dropbox",
  providerIcon: "dropbox-logo.png",
  providerId: "dropbox",
  description: "Connect your Dropbox account\n(Raycast Extension Demo)",
});

// Authorization

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://www.dropbox.com/oauth2/authorize",
    clientId: clientId,
    scope: "account_info.read files.metadata.read",
    extraParameters: { token_access_type: "offline" },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://www.dropbox.com/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://www.dropbox.com/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

// API

export async function fetchItems(): Promise<{ id: string; title: string }[]> {
  const params = {
    path: "",
  };

  const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as { entries: { id: string; name: string }[] };
  return json.entries.map((item) => ({ id: item.id, title: item.name }));
}
