import { OAuth } from "@raycast/api";
import { Deps } from "./deps";
import { exchangeOpenRouterCode, OPENROUTER_AUTH_URL, openRouterAuthUrl } from "./openrouter-auth";

// OpenRouter doesn't register extensions one by one, so this is only a label for the request.
const CLIENT_ID = "ai-limits-raycast";

// Opens OpenRouter in the browser, waits for the user to approve, and returns the API key OpenRouter made for them. The
// key is returned rather than stored, so the caller saves it with saveConnections like the other connections. `signal`
// stops the sign-in: when it is aborted before the approval comes back, undefined is returned and no key is requested.
// Tests never import this file, because it needs @raycast/api. The pure parts live in openrouter-auth.ts.
export async function signInWithOpenRouter(deps: Deps, signal?: AbortSignal): Promise<string | undefined> {
  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "OpenRouter",
    providerId: "openrouter",
    providerIcon: "extension-icon.png",
    description: "Sign in to OpenRouter to create an API key for AI Limits. The key is saved in the extension.",
  });
  // The request carries the PKCE verifier and the state that Raycast uses to match the redirect to this sign-in.
  const request = await client.authorizationRequest({ endpoint: OPENROUTER_AUTH_URL, clientId: CLIENT_ID, scope: "" });
  const url = openRouterAuthUrl({
    redirectURI: request.redirectURI,
    state: request.state,
    codeChallenge: request.codeChallenge,
  });
  const response = await client.authorize({ url });
  if (signal?.aborted) {
    return undefined;
  }
  return exchangeOpenRouterCode(deps, response.authorizationCode, request.codeVerifier);
}
