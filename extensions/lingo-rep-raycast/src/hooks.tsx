import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { get, post } from "./fetch";

import { githubService, googleService, googleClientId } from "./oauth";

export const useGet = (url: string) => {
  const [response, setResponse] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jwt] = useCachedState<string>("jwt", "");
  useEffect(() => {
    void (async () => {
      try {
        if (jwt) {
          const res = await get(url, jwt);
          setResponse(res);
        } else setResponse(null);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [jwt]);
  return { response, isLoading };
};

export const usePost = (url: string, body: Record<string, unknown>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [response, setResponse] = useState<unknown | null>(null);
  const [jwt] = useCachedState<string>("jwt", "");
  useEffect(() => {
    void (async () => {
      try {
        if (jwt) {
          const res = await post(url, body, jwt);
          setResponse(res);
        } else setResponse(null);
      } catch (err) {
        console.log("error in post", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [jwt, body]);
  return { response, isLoading };
};

async function refreshGoogleTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", googleClientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setJWT] = useCachedState<string>("jwt", "");
  const [authProvider] = useCachedState<string>("authProvider", "");
  const [, setUserId] = useCachedState<string>("userId", "");

  useEffect(() => {
    void (async () => {
      if (authProvider === "github") {
        const tokenSet = await githubService.client.getTokens();
        if (tokenSet && !tokenSet.isExpired()) setIsAuthenticated(true);
      } else if (authProvider === "google") {
        let tokenSet = await googleService.client.getTokens();
        if (tokenSet?.accessToken) {
          if (tokenSet.refreshToken && tokenSet.isExpired()) {
            await googleService.client.setTokens(await refreshGoogleTokens(tokenSet.refreshToken));
          }
          tokenSet = await googleService.client.getTokens();
          if (tokenSet?.accessToken && !tokenSet?.isExpired()) setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
        setJWT("");
        setUserId("");
      }
    })();
  }, [authProvider]);

  return isAuthenticated;
};
