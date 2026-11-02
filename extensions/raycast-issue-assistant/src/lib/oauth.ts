import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "extension-icon.png",
  description: "Connect your GitHub account",
});

const CLIENT_ID = "Iv1.8a61f9b3a7aba766";
const CLIENT_SECRET = "c4f1a9e27b6d03e58f1d2c7ab9e4063d15f7c28e";

export async function authorize() {
  const request = await client.authorizationRequest({
    endpoint: "https://github.com/login/oauth/authorize",
    clientId: CLIENT_ID,
    scope: "repo",
  });
  const { authorizationCode } = await client.authorize(request);
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: authorizationCode }),
  });
  const tokens = (await response.json()) as { access_token: string; expires_in: number; refresh_token: string };
  await client.setTokens({ accessToken: tokens.access_token });
  return tokens.access_token;
}
