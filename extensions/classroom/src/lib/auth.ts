import { getPreferenceValues, OAuth } from "@raycast/api";

const preferences = () => getPreferenceValues<Preferences>();
export const scopesForRole = (role: string) =>
  [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    role === "teacher"
      ? "https://www.googleapis.com/auth/classroom.coursework.students.readonly"
      : "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  ].join(" ");

function client() {
  const { clientId, role } = preferences();
  if (!clientId?.trim())
    throw new Error(
      "Add a Google OAuth client ID in Extension Preferences, then run Connect Google Classroom. See the README for setup.",
    );
  return {
    clientId: clientId.trim(),
    role,
    oauth: new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.AppURI,
      providerName: "Google Classroom",
      providerId: `classroom-${clientId.trim()}-${role}`,
      description: "Read your courses and coursework in Raycast",
    }),
  };
}

function grantedScopes(value: unknown, role: string): string {
  if (value === undefined)
    throw new Error(
      "Google's granted permissions could not be confirmed because no scope was returned or stored. Run Connect Google Classroom again.",
    );
  const scopes = typeof value === "string" ? value.split(" ") : value;
  // OAuth scope tokens are printable ASCII, excluding space, double quote and backslash.
  if (
    !Array.isArray(scopes) ||
    scopes.length === 0 ||
    scopes.some(
      (scope) =>
        typeof scope !== "string" || !/^[\x21\x23-\x5B\x5D-\x7E]+$/.test(scope),
    )
  )
    throw new Error(
      "Google's granted permissions were malformed and could not be confirmed. Run Connect Google Classroom again.",
    );
  if (
    scopesForRole(role)
      .split(" ")
      .some((scope) => !scopes.includes(scope))
  )
    throw new Error(
      "Google did not grant both required read-only permissions for courses and published coursework in the selected role. Run Connect Google Classroom and approve both permissions.",
    );
  return [...new Set(scopes)].join(" ");
}

async function exchange(params: URLSearchParams): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params,
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Google sign-in failed (${response.status}). Check your OAuth client configuration, then reconnect.`,
    );
  let tokens: OAuth.TokenResponse;
  try {
    tokens = await response.json();
  } catch {
    throw new Error("Google returned an unexpected sign-in response.");
  }
  if (
    !tokens ||
    typeof tokens !== "object" ||
    typeof tokens.access_token !== "string" ||
    !tokens.access_token.trim()
  )
    throw new Error("Google did not return an access token.");
  return tokens;
}

async function authorize(
  oauth: OAuth.PKCEClient,
  clientId: string,
  role: string,
): Promise<string> {
  const request = await oauth.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId,
    scope: scopesForRole(role),
    extraParameters: { access_type: "offline", prompt: "consent" },
  });
  const { authorizationCode } = await oauth.authorize(request);
  const tokens = await exchange(
    new URLSearchParams({
      client_id: clientId,
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: request.redirectURI,
    }),
  );
  tokens.scope = grantedScopes(tokens.scope, role);
  // Replace the previous connection only after consent, exchange and permission validation succeed.
  await oauth.setTokens(tokens);
  return tokens.access_token;
}

export async function accessToken(interactive = false): Promise<string> {
  const { oauth, clientId, role } = client();
  const saved = await oauth.getTokens();
  if (saved) {
    try {
      const savedScopes = grantedScopes(saved.scope, role);
      if (saved.accessToken && !saved.isExpired()) return saved.accessToken;
      if (saved.refreshToken) {
        const tokens = await exchange(
          new URLSearchParams({
            client_id: clientId,
            grant_type: "refresh_token",
            refresh_token: saved.refreshToken,
          }),
        );
        // An omitted refresh scope retains the original grant (RFC 6749 sections 5.1 and 6).
        // Only a previously validated saved grant can supply that value; malformed/partial replies fail.
        tokens.scope = grantedScopes(
          tokens.scope === undefined ? savedScopes : tokens.scope,
          role,
        );
        tokens.refresh_token ??= saved.refreshToken;
        await oauth.setTokens(tokens);
        return tokens.access_token;
      }
    } catch (error) {
      // Failed refresh or permission validation must not erase the existing connection.
      if (!interactive) throw error;
    }
  }
  if (!interactive)
    throw new Error(
      "Run Connect Google Classroom to sign in before browsing your courses.",
    );
  return authorize(oauth, clientId, role);
}

export async function reconnect() {
  const { oauth, clientId, role } = client();
  return authorize(oauth, clientId, role);
}

/** True when the extension is configured for a student's own coursework. */
export function isStudent(): boolean {
  return preferences().role !== "teacher";
}
