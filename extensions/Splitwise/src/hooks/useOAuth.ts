import fetch from "node-fetch";
import { OAuth } from "@raycast/api";
import { useRef } from "react";
import { usePromise } from "@raycast/utils";

const clientId = "T1iAo3TazydG1xjfyURTWGiUVj0x1KOAIeGNQQND";
const tokenURL = "https://raycast-pkce-proxy-splitwise.fly.dev/token";
const authorizeURL = "https://raycast-pkce-proxy-splitwise.fly.dev/authorize";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Splitwise",
  providerIcon: "command-icon.png",
  description: "Connect your Splitwise account…",
});

export function useOAuth(prompt = false): OAuth.TokenSet | undefined {
  const abortable = useRef<AbortController>();

  const { data: tokenSet } = usePromise(
    async () => {
      if (prompt) {
        await authorize();
      }
      return await client.getTokens();
    },
    [],
    { abortable }
  );

  return tokenSet;
}

export async function getTokens(prompt = false): Promise<OAuth.TokenSet> {
  if (prompt) {
    await authorize();
  }
  const tokenSet = await client.getTokens();
  if (!tokenSet) {
    throw new Error("Invalid state");
  }
  return tokenSet;
}

async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: authorizeURL,
    clientId: clientId,
    scope: "",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(tokenURL, {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(tokenURL, {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
