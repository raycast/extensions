import { OAuth } from "@raycast/api";
import { apiClient, API_URL, CLIENT_ID } from "./api";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Campsite",
  providerIcon: "extension-icon.png",
  description: "Connect your Campsite account…",
});

export async function authorize(): Promise<void> {
  const tokenSet = await oauthClient.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await oauthClient.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${API_URL}/oauth/authorize`,
    clientId: CLIENT_ID,
    scope: "read_organization read_user",
    extraParameters: {
      actor: "user",
    },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);

  await oauthClient.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  return apiClient.post<OAuth.TokenResponse>(
    `/oauth/token`,
    {
      client_id: CLIENT_ID,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    },
    { baseUrl: API_URL, requireOrgSlug: false },
  );
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await apiClient.post<OAuth.TokenResponse>(
    `/oauth/token`,
    {
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    },
    { baseUrl: API_URL, requireOrgSlug: false },
  );

  response.refresh_token = response.refresh_token ?? refreshToken;

  return response;
}
