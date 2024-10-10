import "dotenv/config";
import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

import { Client } from "@notionhq/client";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerIcon: "notion_logo.png",
  providerName: "Notion",
  description: "To correctly use Pilot, we need you to connect to your Notion Account",
});

const UseOAuth = () => {
  const [notion, setNotion] = useState<Client | undefined>(undefined);

  const handleOAuth = async () => {
    const tokenSet = await client.getTokens();

    if (tokenSet?.accessToken) {
      if (tokenSet.refreshToken && tokenSet.isExpired()) {
        await client.setTokens(await refreshTokens(tokenSet.refreshToken));
      }
      const initToken = tokenSet.accessToken;
      const initNotion = new Client({
        auth: initToken,
      });
      setNotion(initNotion);
      return;
    }

    //CONEXION
    const authRequest = await client.authorizationRequest({
      endpoint: "https://server.romubuntu.dev:5000/authorize",
      clientId: "f05b8622-7836-4379-b0e6-24924f5a5cfa",
      scope: "",
      extraParameters: {
        response_type: "code",
        owner: "user",
      },
    });

    const { authorizationCode } = await client.authorize(authRequest);

    const token = await fetchTokens(authRequest, authorizationCode);
    await client.setTokens(token);
  };

  useEffect(() => {
    handleOAuth();
  }, []);

  async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
    const body = JSON.stringify({
      client_id: "f05b8622-7836-4379-b0e6-24924f5a5cfa",
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    });

    const response = await fetch("https://server.romubuntu.dev:5000/token", {
      method: "POST",
      body: body,
    });
    if (!response.ok) {
      console.error("fetch tokens error:", await response.text());
      throw new Error(response.statusText);
    }
    return (await response.json()) as OAuth.TokenResponse;
  }

  async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
    const params = new URLSearchParams();
    params.append("client_id", "YourClientId");
    params.append("refresh_token", refreshToken);
    params.append("grant_type", "refresh_token");

    const response = await fetch("https://server.romubuntu.dev:5000/refreshToken", {
      method: "POST",
      body: params,
    });
    if (!response.ok) {
      console.error("refresh tokens error:", await response.text());
      throw new Error(response.statusText);
    }

    const tokenResponse = (await response.json()) as OAuth.TokenResponse;
    tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
    return tokenResponse;
  }

  return { handleOAuth, notion, client };
};

export default UseOAuth;
