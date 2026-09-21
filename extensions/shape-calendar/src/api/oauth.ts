import { environment, LaunchType, LocalStorage, OAuth } from "@raycast/api";

const ORIGIN = "https://shapecalendar.com";
const CLIENT_ID_KEY = "oauth-client-id";
const REQUEST_TIMEOUT_MS = 30_000;
// Shape matches redirect URIs by exact string, so this has to be the literal
// value Raycast sends for OAuth.RedirectMethod.Web.
const REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Shape Calendar",
  providerIcon: "logo.png",
  providerId: "shape-calendar",
  description: "Connect your Shape Calendar account",
});

async function registerClient(): Promise<string> {
  const response = await fetch(`${ORIGIN}/oauth/register`, {
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Could not register with Shape Calendar (status ${response.status})`,
    );
  }
  const { client_id } = (await response.json()) as { client_id: string };
  await LocalStorage.setItem(CLIENT_ID_KEY, client_id);
  return client_id;
}

// Shape uses dynamic client registration and drops client records that have
// been idle for 90 days, so make sure the stored one still exists before
// sending the user to the consent screen.
async function getClientId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
  if (stored) {
    const response = await fetch(
      `${ORIGIN}/api/oauth/client/${encodeURIComponent(stored)}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    if (response.ok) {
      const { redirect_uris } = (await response.json()) as {
        redirect_uris: string[];
      };
      if (redirect_uris.includes(REDIRECT_URI)) return stored;
    } else if (response.status !== 404) {
      throw new Error(
        `Could not reach Shape Calendar (status ${response.status})`,
      );
    }
  }
  return registerClient();
}

export async function hasAccessToken(): Promise<boolean> {
  const tokens = await client.getTokens();
  return Boolean(tokens?.accessToken);
}

// Commands fire requests in parallel; they must share one sign-in flow
// rather than each opening their own.
let pendingAuthorization: Promise<string> | undefined;

export function authorize(): Promise<string> {
  pendingAuthorization ??= runAuthorization().finally(() => {
    pendingAuthorization = undefined;
  });
  return pendingAuthorization;
}

async function runAuthorization(): Promise<string> {
  const tokens = await client.getTokens();
  if (tokens?.accessToken) return tokens.accessToken;

  // The sign-in screen can't be shown from a background refresh, including
  // when a revoked token is discovered halfway through one.
  if (environment.launchType === LaunchType.Background) {
    throw new Error("Sign in to Shape Calendar to continue.");
  }

  const clientId = await getClientId();
  const authRequest = await client.authorizationRequest({
    endpoint: `${ORIGIN}/oauth/authorize`,
    clientId,
    scope: "mcp",
  });
  const { authorizationCode } = await client.authorize(authRequest);

  const response = await fetch(`${ORIGIN}/oauth/token`, {
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: authRequest.redirectURI,
      client_id: clientId,
      code_verifier: authRequest.codeVerifier,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error_description?: string;
    };
    throw new Error(
      body.error_description ||
        `Could not sign in to Shape Calendar (status ${response.status})`,
    );
  }

  // Shape access tokens don't expire and there are no refresh tokens; a
  // revoked token surfaces as a 401 and we run the consent flow again.
  const { access_token } = (await response.json()) as { access_token: string };
  await client.setTokens({ accessToken: access_token });
  return access_token;
}

// Only drops the token that was rejected, so a parallel request that also got
// a 401 can't wipe the fresh token a sibling just signed in for.
export async function resetAuthorization(rejectedToken: string): Promise<void> {
  const tokens = await client.getTokens();
  if (tokens?.accessToken === rejectedToken) await client.removeTokens();
}
