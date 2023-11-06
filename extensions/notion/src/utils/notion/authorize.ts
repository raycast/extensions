import { Client } from "@notionhq/client";
import { OAuth, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "c843219a-d93c-403c-8e4d-e8aa9a987494";
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerIcon: "notion-logo.png",
  providerId: "notion",
  description: "Connect your Notion account",
});

const preferenceToken = getPreferenceValues().notion_token;
export let notion = new Client({ auth: preferenceToken });

let alreadyAuthorizing: Promise<void> | false = false;

export async function authorize() {
  // we are authorized with a token in the preference
  if (preferenceToken) {
    return;
  }

  const tokenSet = await client.getTokens();
  // we are already authorized with oauth
  if (tokenSet?.accessToken) {
    notion = new Client({
      auth: tokenSet.accessToken,
    });
    return;
  }

  if (alreadyAuthorizing) {
    await alreadyAuthorizing;
    return;
  }

  // we aren't yet authorized so let's do so now
  alreadyAuthorizing = new Promise((resolve, reject) => {
    async function run() {
      const authRequest = await client.authorizationRequest({
        endpoint: "https://notion.oauth.raycast.com/authorize",
        clientId,
        scope: "",
        extraParameters: { owner: "user" },
      });
      const { authorizationCode } = await client.authorize(authRequest);
      const tokens = await fetchTokens(authRequest, authorizationCode);

      await client.setTokens(tokens);

      notion = new Client({
        auth: (await client.getTokens())?.accessToken,
      });
    }

    run().then(resolve, reject);
  });

  await alreadyAuthorizing;
}

export async function fetchTokens(authRequest: OAuth.AuthorizationRequest, code: string) {
  const response = await fetch("https://notion.oauth.raycast.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}
