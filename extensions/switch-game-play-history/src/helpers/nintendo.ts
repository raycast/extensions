import { getPreferenceValues, showToast, Toast, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import base64url from "base64url";
import crypto from "crypto";
import { IPlayHistories, ISessionToken, IToken } from "../types/nintendo";
import { syncDataToNotionDatabase } from "./notion";
import { parseUrlParams } from "./utils";
import getCache from "./cache";

const NINTENDO_CLIENT_ID = "5c38e31cd085304b";

const getAuthenticationUrl = () => {
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

export const useToken = () => {
  const sessionToken = getPreferenceValues<{ NINTENDO_SESSION_TOKEN?: string }>().NINTENDO_SESSION_TOKEN;
  const cache = getCache<IToken & { session_token: string }>("TOKEN", {
    expiration: 800,
  });
  let cachedToken = cache.get();
  if (cachedToken && cachedToken.session_token !== sessionToken) {
    cachedToken = undefined;
    cache.remove();
  }
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
    keepPreviousData: false,
    initialData: cachedToken,
    onError: (error) => {
      showToast(Toast.Style.Failure, error.name, error.message);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Fetching Token");
    },
    onData: (data) => {
      if (sessionToken && data.access_token !== cachedToken?.access_token) {
        cache.set({ ...data, session_token: sessionToken });
      }
    },
  });
  if (!cachedToken) {
    token.data = {
      expires_in: 0,
      id_token: "",
      scope: [],
      access_token: "",
      token_type: "",
    };
  }
  return token;
};
export const usePlayHistories = () => {
  const { SYNC_TO_NOTION } = getPreferenceValues<{
    SYNC_TO_NOTION: boolean;
  }>();
  const token = useToken();
  const cache = getCache<IPlayHistories>("HISTORY");
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
        showToast(Toast.Style.Animated, `${cachedHistories ? "Updating" : "Loading"} Play Histories`);
      },
      onData: async (data) => {
        cache.set(data);
        await showToast(Toast.Style.Success, "Success");
        if (SYNC_TO_NOTION) await syncDataToNotionDatabase(data.playHistories);
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
      showToast(Toast.Style.Animated, "Fetching Session Token");
    },
    onData: (data) => {
      if (data.session_token) {
        cache.set("NINTENDO_SESSION_TOKEN", JSON.stringify({ value: data.session_token, fetchTime: Date.now() }));
      }
      showToast(Toast.Style.Success, "Success");
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
