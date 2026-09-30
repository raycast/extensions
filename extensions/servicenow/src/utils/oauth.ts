import { OAuth } from "@raycast/api";

import { Instance } from "../types";
import { getInstanceBaseUrl } from "./instanceUrl";

export const DEFAULT_OAUTH_CLIENT_ID = "9aa7c0a198ec49009258a918c94eca90";

export function getClientId(instance: Instance): string {
  return instance.clientId?.trim() || DEFAULT_OAUTH_CLIENT_ID;
}

export async function authorizeInstance(
  instance: Instance,
): Promise<{ accessToken: string; refreshToken: string; tokenExpiresAt: number; oauthUserName?: string }> {
  const clientId = getClientId(instance);
  const baseUrl = getInstanceBaseUrl(instance);

  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "ServiceNow",
    providerIcon: "servicenow.png",
    description: "Connect your ServiceNow instance",
  });

  const authRequest = await client.authorizationRequest({
    endpoint: `${baseUrl}/oauth_auth.do`,
    clientId,
    scope: "useraccount",
  });

  const { authorizationCode } = await client.authorize(authRequest);

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("client_id", clientId);

  const response = await fetch(`${baseUrl}/oauth_token.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (json.error || !json.access_token || !json.refresh_token) {
    throw new Error(json.error_description || json.error || "Token exchange failed.");
  }

  const accessToken = json.access_token;
  const refreshToken = json.refresh_token;
  const tokenExpiresAt = Date.now() + (json.expires_in ?? 1800) * 1000;

  let oauthUserName: string | undefined;
  try {
    const userResponse = await fetch(`${baseUrl}/api/now/ui/user/current_user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userJson = (await userResponse.json()) as { result?: { user_name?: string } };
    oauthUserName = userJson.result?.user_name;
  } catch (error) {
    console.error("Could not fetch OAuth user_name:", error);
  }

  return { accessToken, refreshToken, tokenExpiresAt, oauthUserName };
}
