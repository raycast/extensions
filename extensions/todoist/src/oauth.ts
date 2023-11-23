import { OAuth } from "@raycast/api";
import axios from "axios";

const clientId = "9c06463da9ea494aa21fd881140b9dd4";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Todoist",
  providerIcon: "todoist.png",
  providerId: "todoist",
  description: "Connect your Todoist account",
});

export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    clientId,
    endpoint: "https://todoist.oauth-proxy.raycast.com/authorize",
    scope: "data:read_write,data:delete,project:delete",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string) {
  const response = await axios.post<OAuth.TokenResponse>("https://todoist.oauth-proxy.raycast.com/token", {
    client_id: clientId,
    code: authCode,
    code_verifier: authRequest.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: authRequest.redirectURI,
  });

  return response.data;
}
