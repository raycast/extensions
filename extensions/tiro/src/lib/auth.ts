import { getPreferenceValues, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

// Public PKCE client "Tiro for Raycast", registered for the Raycast redirect URL
// (https://raycast.com/redirect?packageName=Extension) through Tiro's open client registration.
// No client secret is involved.
const CLIENT_ID = "0e385d67-2bd8-4e91-b41d-13a295c511bb";
const TOKEN_URL = "https://api.tiro.ooo/v1/oauth/token";

// Tiro issues tokens per resource (RFC 8707). Clients registered through the open registration
// endpoint may only ask for the MCP server, which is what lib/api.ts talks to.
const API_RESOURCE = "https://mcp.tiro.ooo/mcp";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Tiro",
  providerIcon: "tiro-icon.png",
  providerId: "tiro",
  description: "Sign in to Tiro to search and read your notes.",
});

// OAuthService only sends `extraParameters` with the authorization request, so the token
// exchange and refresh are overridden to carry `resource` as well.
class TiroOAuthService extends OAuthService {
  async fetchTokens({
    authRequest,
    authorizationCode,
  }: {
    authRequest: OAuth.AuthorizationRequest;
    authorizationCode: string;
  }): Promise<OAuth.TokenResponse> {
    const response = await requestTokens({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: authRequest.codeVerifier,
      redirect_uri: authRequest.redirectURI,
    });
    if (!response.ok) throw new Error(`Tiro sign-in failed (${response.status}). Please try again.`);
    return (await response.json()) as OAuth.TokenResponse;
  }

  async refreshTokens({ token }: { token: string }): Promise<OAuth.TokenResponse | undefined> {
    const response = await requestTokens({ grant_type: "refresh_token", refresh_token: token });
    if (!response.ok) {
      this.client.description = "Tiro needs you to sign in again.";
      await this.client.removeTokens();
      return undefined;
    }
    const tokens = (await response.json()) as OAuth.TokenResponse;
    return { ...tokens, refresh_token: tokens.refresh_token ?? token };
  }
}

function requestTokens(params: Record<string, string>) {
  return fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({ client_id: CLIENT_ID, resource: API_RESOURCE, ...params }),
  });
}

// An account API key in the preferences takes over from the sign-in flow when it's set.
export const tiro = new TiroOAuthService({
  client,
  clientId: CLIENT_ID,
  scope: "note:read note_summary:read",
  authorizeUrl: "https://api.tiro.ooo/v1/oauth/authorize",
  tokenUrl: TOKEN_URL,
  refreshTokenUrl: TOKEN_URL,
  bodyEncoding: "url-encoded",
  extraParameters: { resource: API_RESOURCE },
  personalAccessToken: getPreferenceValues<Preferences>().apiKey?.trim() || undefined,
});

export async function signOut() {
  await client.removeTokens();
}
