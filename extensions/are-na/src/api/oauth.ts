import { OAuth, getPreferenceValues } from "@raycast/api";

const CLIENT_ID = "lzVrY-PAr2pU1GH6cDVrr9_8rW1k7dis3vKuyrO1mvw";
const REDIRECT_URI = "https://raycast.com/redirect/extension";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Are.na",
  providerIcon: "extension-icon.png",
  description: "Connect your Are.na account to search, browse, and create content.",
});

async function fetchTokens(codeVerifier: string, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", REDIRECT_URI);

  const response = await fetch("https://api.are.na/v3/oauth/token", {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("arena oauth token exchange error:", text);
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://www.are.na/oauth/authorize",
    clientId: CLIENT_ID,
    scope: "read write",
  });

  const authUrl =
    "https://www.are.na/oauth/authorize?" +
    new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "read write",
      state: authRequest.state,
      code_challenge: authRequest.codeChallenge,
      code_challenge_method: "S256",
    }).toString();

  const { authorizationCode } = await client.authorize({ url: authUrl });
  const tokens = await fetchTokens(authRequest.codeVerifier, authorizationCode);
  await client.setTokens(tokens);
  return tokens.access_token;
}

const { accessToken } = getPreferenceValues<Preferences>();

export const arenaOAuth = {
  client,
  authorize,
  personalAccessToken: accessToken || undefined,
};
