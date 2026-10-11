import { OAuth } from "@raycast/api";
import { CLIENT_ID, createTokenReader, exchangeToken, hasRequiredScopes, REDIRECT_URI, SCOPES } from "./oauth-core";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "RevenueCat",
  providerIcon: "revenuecat-icon.png",
  providerId: "revenuecat",
});
const readAccessToken = createTokenReader(client);
let signInPromise: Promise<void> | undefined;
function signIn(): Promise<void> {
  if (signInPromise) return signInPromise;
  signInPromise = (async () => {
    const request = await client.authorizationRequest({
      endpoint: "https://api.revenuecat.com/oauth2/authorize",
      clientId: CLIENT_ID,
      scope: SCOPES.join(" "),
      extraParameters: { redirect_uri: REDIRECT_URI },
    });
    const { authorizationCode } = await client.authorize(request);
    const tokens = await exchangeToken({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: REDIRECT_URI,
    });
    await client.setTokens({ ...tokens, scope: tokens.scope ?? SCOPES.join(" ") });
  })().finally(() => {
    signInPromise = undefined;
  });
  return signInPromise;
}
export async function credential(): Promise<string> {
  const token = await readAccessToken();
  if (token) return token;
  throw new Error("Open a RevenueCat command to connect your account.");
}

// Foreground commands show Raycast's native OAuth overlay before loading any views.
export async function authorize(): Promise<void> {
  try {
    if (await readAccessToken()) {
      if (hasRequiredScopes((await client.getTokens())?.scope)) return;
    }
  } catch (error) {
    // A revoked/expired connection is cleared by the token reader. Network errors
    // retain the session and should be retried without starting a new login.
    if (await client.getTokens()) throw error;
  }
  await signIn();
}
