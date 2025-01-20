import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { get, post } from "./fetch";

import { githubService, googleService } from "./oauth";

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

export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setJWT] = useCachedState<string>("jwt", "");
  const [authProvider] = useCachedState<string>("authProvider", "");
  const [, setUserId] = useCachedState<string>("userId", "");
  useEffect(() => {
    void (async () => {
      if (authProvider === "github") {
        const tokensObj = await githubService.client.getTokens();
        if (tokensObj && !tokensObj.isExpired()) setIsAuthenticated(true);
      } else if (authProvider === "google") {
        const tokensObj = await googleService.client.getTokens();
        if (tokensObj && !tokensObj.isExpired()) setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setJWT("");
        setUserId("");
      }
    })();
  }, [authProvider]);

  return isAuthenticated;
};
