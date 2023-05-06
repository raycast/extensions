import { getPreferenceValues, showToast, Toast, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import base64url from "base64url";
import crypto from "crypto";
import { IPlayHistories, ISessionToken, IToken } from "../types/nintendo";
import { useEffect, useMemo, useState } from "react";
import { parseUrlParams } from "./utils";
import getCache from "./cache";
export const NINTENDO_CLIENT_ID = "5c38e31cd085304b";
const getSessionToken = () => {
  return getPreferenceValues<{ NINTENDO_SESSION_TOKEN: string }>().NINTENDO_SESSION_TOKEN;
};
export const useToken = () => {
  const sessionToken = getSessionToken();
  const cache = getCache<IToken>("TOKEN", {
    expiration: 800,
  });
  const cachedToken = cache.get();
  const token = useFetch<IToken, IToken>("https://accounts.nintendo.com/connect/1.0.0/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "com.nintendo.znej/1.13.0 (Android/7.1.2)",
    },
    body: JSON.stringify({
      client_id: NINTENDO_CLIENT_ID,
      session_token: sessionToken,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
    }),
    execute: !cachedToken && !!sessionToken,
    initialData: cachedToken,
    keepPreviousData: false,
    onError: (error) => {
      showToast(Toast.Style.Failure, error.name, error.message);
    },
    onData: (data) => {
      cache.set(data);
    },
  });
  return token;
};
export const usePlayHistories = () => {
  const token = useToken();
  const sessionToken = getSessionToken();
  const cache = getCache<IPlayHistories>("HISTORY" + sessionToken);
  const cachedHistories = cache.get();
  const histories = useFetch<IPlayHistories, IPlayHistories>(
    "https://mypage-api.entry.nintendo.co.jp/api/v1/users/me/play_histories",
    {
      method: "GET",
      execute: !!token.data?.access_token,
      headers: {
        "User-Agent": "com.nintendo.znej/1.13.0 (Android/7.1.2)",
        Authorization: `Bearer ${token.data?.access_token}`,
      },
      keepPreviousData: false,
      initialData: cachedHistories,
      onError: (error) => {
        showToast(Toast.Style.Failure, error.name, error.message);
      },
      onWillExecute: () => {
        showToast(Toast.Style.Animated, `${cachedHistories ? "Updating" : "Fetching"} play histories...`);
      },
      onData: (data) => {
        cache.set(data);
        showToast(Toast.Style.Success, "Play histories fetched successfully");
      },
    }
  );
  return histories;
};
export const useSessionToken = () => {
  const [url, setUrl] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const cache = new Cache();
  useEffect(() => {
    const { url, verifier, state } = getAuthenticationUrl();
    setUrl(url);
    setVerifier(verifier);
    setState(state);
  }, []);
  const getCode = (url: string) => {
    const params: {
      session_state?: string;
      session_token_code?: string;
      state?: string;
    } = parseUrlParams(url);
    if (!url.startsWith(`npf${NINTENDO_CLIENT_ID}://auth#`)) {
      throw new Error("Invalid URL");
    }
    if (!params.state) {
      throw new Error("State is missing");
    }
    if (params.state !== state) {
      throw new Error("State does not match");
    }
    if (!params.session_token_code) {
      throw new Error("Session token code is missing");
    }
    setCode(params.session_token_code as string);
    return params.session_token_code;
  };
  const sessionToken = useFetch<ISessionToken>("https://accounts.nintendo.com/connect/1.0.0/api/session_token", {
    method: "POST",
    headers: {
      "User-Agent": "com.nintendo.znej/1.13.0 (Android/7.1.2)",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Platform": "Android",
      "X-ProductVersion": "2.5.0",
    },
    body: new URLSearchParams({
      client_id: NINTENDO_CLIENT_ID,
      session_token_code: code || "",
      session_token_code_verifier: verifier || "",
    }).toString(),
    execute: !!code && !!verifier,
    keepPreviousData: false,
    onError: (error) => {
      showToast(Toast.Style.Failure, error.name, error.message);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Fetching session token...");
    },
    onData: (data) => {
      if (data.session_token) {
        cache.set("NINTENDO_SESSION_TOKEN", JSON.stringify({ value: data.session_token, fetchTime: Date.now() }));
      }
      showToast(Toast.Style.Success, "Session token fetched successfully");
    },
  });
  const getCachedSessionToken = () => {
    const cached = cache.get("NINTENDO_SESSION_TOKEN");
    const data: {
      value: string | undefined;
      fetchTime: number | undefined;
    } = cached ? JSON.parse(cached) : {};
    return data;
  };
  return { sessionToken, url, getCode, getCachedSessionToken };
};
export const getAuthenticationUrl = () => {
  const state = base64url(crypto.randomBytes(36));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());

  const params = {
    state,
    client_id: NINTENDO_CLIENT_ID,
    redirect_uri: `npf${NINTENDO_CLIENT_ID}://auth`,
    scope: "openid user user.mii user.email user.links[].id",
    response_type: "session_token_code",
    session_token_code_challenge: challenge,
    session_token_code_challenge_method: "S256",
    theme: "login_form",
  };

  const url = "https://accounts.nintendo.com/connect/1.0.0/authorize?" + new URLSearchParams(params).toString();
  return { url, verifier, state };
};
