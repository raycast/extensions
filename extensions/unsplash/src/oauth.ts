import { OAuth, getPreferenceValues } from "@raycast/api";

/**
 * Redirect URI users register in their Unsplash app (shown in the setup guide).
 */
export const REGISTERED_REDIRECT_URI = "https://raycast.com/redirect";

/**
 * Redirect URI sent in both authorize and token exchange. raycast.com/redirect needs
 * `packageName` to build the "Open Raycast" deep link; Unsplash accepts the extra query
 * against the registered URI above. Pinned so macOS and Windows send the same value.
 * @see https://developers.raycast.com/api-reference/oauth#oauth.redirectmethod
 */
export const REDIRECT_URI = `${REGISTERED_REDIRECT_URI}?packageName=Extension`;

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Unsplash",
  providerIcon: "unsplash-logo.png",
  description: "Login to your Unsplash account.",
});

function formBody(values: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    params.append(key, value);
  }
  return params.toString();
}

async function parseTokenError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { error?: string; error_description?: string; errors?: string[] };
    if (json.error_description) return json.error_description;
    if (json.error) return json.error;
    if (json.errors?.length) return json.errors.join(", ");
  } catch {
    // not JSON
  }
  return text || response.statusText || `HTTP ${response.status}`;
}

export async function doAuth() {
  const { accessKey, secretKey } = getPreferenceValues<Preferences>();
  const clientId = accessKey.trim();
  const clientSecret = secretKey.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Access Key and Secret Key are required. Check extension preferences.");
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://unsplash.com/oauth/authorize",
    clientId,
    scope: "public read_user write_likes",
    extraParameters: {
      redirect_uri: REDIRECT_URI,
    },
  });

  const { authorizationCode } = await client.authorize(authRequest);

  // Unsplash validates the PKCE challenge sent by PKCEClient, so the verifier is
  // required alongside client_secret. Send the same redirect_uri as the authorize step.
  const tokenResponse = await fetch("https://unsplash.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: formBody({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code: authorizationCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const message = await parseTokenError(tokenResponse);
    console.error("fetch tokens error:", message);
    throw new Error(message);
  }

  await client.setTokens((await tokenResponse.json()) as OAuth.TokenResponse);
}
