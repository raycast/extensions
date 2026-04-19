import { OAuth } from "@raycast/api";

const CLIENT_ID = "210a0b1d-9a6c-43bc-8e74-c2f500dc519b";
const AUTHORIZE_URL =
  "https://oauth.raycast.com/v1/authorize/N_NsRbU_Il4cxQjeBlsgUQJiHKVPFOgB5gtqC5sAbVMka_Nt4RGId7IEskdfKNeI1Ix3JvEsR0HrYXfID6XmmuR5SKLOGDvt93xEKNOjQW_bt5dFsaymagoB0glmKuSG69I6mHOC_50x351h286eK9Nv3HVlCXdxo6b3Pia6CD2r00Av";
const TOKEN_URL =
  "https://oauth.raycast.com/v1/token/DW_1k9hixRjqobLSppGn6w3Pl5BgDu5-dIAhs7-LJVoFPbykV3uE5St7ywbddeABXg-ipmJ79wIyk8Me-NwXNd22RN-HSCeGW7S3S2l9e3ovwTgNmJM0CF-Ew6sbam49CO8j8uMkFqowCdbstoQ7leOtLlB4J9ZvUdZ_cWkL3EQ";
const SCOPES = "Tasks.ReadWrite offline_access";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Microsoft",
  providerIcon: "microsoft-logo.png",
  description: "Connect your Microsoft account to manage To Do tasks",
});

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams();
  body.append("client_id", CLIENT_ID);
  body.append("code", authCode);
  body.append("code_verifier", authRequest.codeVerifier);
  body.append("grant_type", "authorization_code");
  body.append("scope", SCOPES);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange error:", errorText);
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(
  refreshToken: string,
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams();
  body.append("client_id", CLIENT_ID);
  body.append("refresh_token", refreshToken);
  body.append("grant_type", "refresh_token");
  body.append("scope", SCOPES);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh error:", errorText);
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokens = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(newTokens);
      return newTokens.access_token;
    }
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: CLIENT_ID,
    scope: SCOPES,
  });

  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);

  return tokens.access_token;
}
