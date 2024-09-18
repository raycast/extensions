import { OAuth } from "@raycast/api";
import { PocketClient } from "../api";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Pocket",
  providerIcon: "pocket-logo.png",
  providerId: "pocket",
  description: "Connect your Pocket account",
});

/*
 * The Pocket Authentication API uses a variant of OAuth 2.0 for authentication.
 * To make it work from Raycast some hacks are needed.
 */
export async function authorize() {
  const pocket = new PocketClient();

  const { code } = await pocket.getAuthorizationCode();

  const authorizationRequest = await oauthClient.authorizationRequest({
    endpoint: "https://getpocket.com/auth/authorize",
    clientId: "",
    scope: "",
    extraParameters: {
      request_token: code,
      redirect_uri: `https://raycast.com/redirect?packageName=Extension&code=${code}`,
    },
  });

  await oauthClient.authorize({
    url: `https://getpocket.com/auth/authorize?request_token=${code}&redirect_uri=${encodeURIComponent(`https://raycast.com/redirect?packageName=Extension&code=${code}&state=${authorizationRequest.state}`)}`,
  });

  const tokens = await pocket.authorize(code);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}

export async function createPocketClient() {
  const tokens = await oauthClient.getTokens();
  const accessToken = tokens?.accessToken || (await authorize());
  return new PocketClient({ accessToken });
}
