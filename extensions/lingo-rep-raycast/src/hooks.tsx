import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { OAuth, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { get, post } from "./fetch";
import { config } from "./config";

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
        console.error("error in post", err);
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

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", params);
    const tokenResponse = response.data as OAuth.TokenResponse;
    tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
    return tokenResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("refresh tokens error:", error.response.data);
      throw new Error(error.response.statusText);
    }
    throw error;
  }
}

export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setJWT] = useCachedState<string>("jwt", "");
  const [authProvider] = useCachedState<string>("authProvider", "");
  const [, setUserId] = useCachedState<string>("userId", "");

  useEffect(() => {
    void (async () => {
      const getJWTAndUserId = async (token: string) => {
        try {
          const response = await axios.get(`${config.apiURL}/auth/${authProvider}/get-jwt`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const tokenResponse = response.data as { message: string; jwt: string };
          if (tokenResponse?.jwt) {
            setJWT(tokenResponse.jwt);
            const userProfileRes = await axios.get(`${config.apiURL}/auth/profile`, {
              headers: {
                Authorization: `Bearer ${tokenResponse.jwt}`,
              },
            });
            const userProfile = userProfileRes.data as { message: string; user: { id: string } };
            setUserId(userProfile.user.id);
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            console.error("Error getting JWT/profile", error.response.data);
            throw new Error(error.response.statusText);
          }
          throw error;
        }
      };

      const resetAuth = () => {
        setIsAuthenticated(false);
        setJWT("");
        setUserId("");
      };
      try {
        if (authProvider === "github") {
          const tokenSet = await githubService.client.getTokens();
          if (tokenSet && !tokenSet.isExpired()) {
            setIsAuthenticated(true);
            await getJWTAndUserId(tokenSet.accessToken);
          }
        } else if (authProvider === "google") {
          let tokenSet = await googleService.client.getTokens();
          if (tokenSet?.accessToken) {
            if (tokenSet.refreshToken && tokenSet.isExpired()) {
              await googleService.client.setTokens(await refreshGoogleTokens(tokenSet.refreshToken));
            }
            tokenSet = await googleService.client.getTokens();
            if (tokenSet?.accessToken && !tokenSet?.isExpired()) {
              setIsAuthenticated(true);
              await getJWTAndUserId(tokenSet.accessToken);
            }
          }
        } else {
          resetAuth();
        }
      } catch (err) {
        resetAuth();

        showToast({ title: "Auth error", style: Toast.Style.Failure });
      }
    })();
  }, [authProvider]);

  return isAuthenticated;
};
