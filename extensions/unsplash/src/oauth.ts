import { OAuth, getPreferenceValues } from "@raycast/api";

/**
 * Explicit redirect URI shared by authorize + token exchange.
 * Raycast's default Web redirect includes `?packageName=Extension`, which many
 * providers (including Unsplash) reject or treat as a mismatch on token exchange.
 * Pinning a fixed URI keeps macOS and Windows consistent with the setup docs.
 * @see https://developers.raycast.com/api-reference/oauth#oauth.redirectmethod
 */
export const REDIRECT_URI = "https://raycast.com/redirect";

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

  // Unsplash uses confidential-client code exchange (client_secret), not PKCE.
  // Send the same redirect_uri used in the authorize step.
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
