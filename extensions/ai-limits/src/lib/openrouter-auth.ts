import { Deps } from "./deps";
import { asRecord, asString, requestJson } from "./http";
import { ProviderError } from "./types";

// The page where the user approves the extension. OpenRouter also accepts the S256 PKCE challenge below.
export const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
const EXCHANGE_URL = "https://openrouter.ai/api/v1/auth/keys";

// Builds the URL for the approval page. After approval OpenRouter sends the user to `callback_url` with `code` added.
// Raycast only matches that redirect to this sign-in when `state` is in the URL, so the state is added to the callback.
export function openRouterAuthUrl(params: { redirectURI: string; state: string; codeChallenge: string }): string {
  // redirectURI already has a query (`?packageName=Extension`), so the state is appended to it rather than replacing it.
  const callback = new URL(params.redirectURI);
  callback.searchParams.set("state", params.state);

  const url = new URL(OPENROUTER_AUTH_URL);
  url.searchParams.set("callback_url", callback.toString());
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// Trades the code from the redirect for the user's own API key. The code_verifier proves that this extension started
// the sign-in, so another app that caught the code can't use it.
export async function exchangeOpenRouterCode(deps: Deps, code: string, codeVerifier: string): Promise<string> {
  const answer = await requestJson(deps, EXCHANGE_URL, {
    method: "POST",
    body: { code, code_verifier: codeVerifier, code_challenge_method: "S256" },
    provider: "OpenRouter",
  });
  const key = asString(asRecord(answer)?.key);
  if (!key) {
    throw new ProviderError("parse", "OpenRouter finished the sign-in without returning an API key");
  }
  return key;
}
