import { OAuth } from "@raycast/api";
import * as userApi from "../api/users";
import config from "../config";
const clientId = "81haf7j73410.c927aa87bagc";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Spike",
  providerIcon: "spike-logo.png",
  description: "Connect your Spike account…",
});

// Authorization
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet && tokenSet.accessToken) {
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${config!.spike}/authorize`,
    clientId: clientId,
    scope: "",
  });
  const { authorizationCode } = await client.authorize(authRequest);

  if (!authorizationCode) {
    throw new Error("Authorization failed");
  }

  await client.setTokens({
    access_token: authorizationCode,
  });
}

// Logout
export async function logout(): Promise<void> {
  await client.removeTokens();
}

// get access token
export async function getToken(): Promise<string> {
  const tokenSet = await client.getTokens();
  return tokenSet && tokenSet.accessToken ? tokenSet.accessToken : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUser(): Promise<any> {
  return await userApi.getUser();
}
