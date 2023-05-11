import { getPreferenceValues, showToast, Toast, Cache, Color } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import base64url from "base64url";
import crypto from "crypto";
import { IGameInformation, IPlayHistories, ISessionToken, IToken } from "../types/nintendo";
import { useEffect, useRef, useState } from "react";
import { parseUrlParams } from "./utils";
import getCache from "./cache";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

const NINTENDO_CLIENT_ID = "5c38e31cd085304b";
const GAME_GENERES = [
  { code: "ACTION", color: "#7FDBFF", label_zh: "動作" },
  { code: "ADVENTURE", color: "#2ECC40", label_zh: "冒險" },
  { code: "ARCADE", color: "#FFDC00", label_zh: "街機" },
  { code: "EDUCATION", color: "#FF851B", label_zh: "學習" },
  { code: "FIGHTING", color: "#FF4136", label_zh: "格鬥" },
  { code: "FIRST_PERSON", color: "#B10DC9", label_zh: "射擊" },
  { code: "LIFESTYLE", color: "#F012BE", label_zh: "實用" },
  { code: "MULTIPLAYER", color: "#0074D9", label_zh: "交流" },
  { code: "MUSIC", color: "#FFD700", label_zh: "音樂" },
  { code: "OTHER", color: "#AAAAAA", label_zh: "其他" },
  { code: "PARTY", color: "#39CCCC", label_zh: "派對" },
  { code: "PLATFORMER", color: "#3D9970", label_zh: "桌上遊戲" },
  { code: "PUZZLE", color: "#01FF70", label_zh: "益智" },
  { code: "RACING", color: "#85144b", label_zh: "競速" },
  { code: "ROLE_PLAYING", color: "#FF7F50", label_zh: "角色扮演" },
  { code: "SIMULATION", color: "#2E4053", label_zh: "模擬" },
  { code: "SPORTS", color: "#8FBC8F", label_zh: "運動" },
  { code: "STRATEGY", color: "#6A5ACD", label_zh: "策略" },
  { code: "TRAINING", color: "#9ACD32", label_zh: "訓練" },
];

const getSessionToken = () => {
  return getPreferenceValues<{ NINTENDO_SESSION_TOKEN: string }>().NINTENDO_SESSION_TOKEN;
};
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
export const getPlayHistory = (titleId: string) => {
  const cache = getCache<IPlayHistories>("HISTORY");
  const cachedHistories = cache.get();
  if (!cachedHistories) return null;
  const history = cachedHistories.playHistories.find((history) => history.titleId === titleId);
  if (!history) return null;
  const totalPlayTime =
    history.totalPlayedMinutes < 60
      ? history.totalPlayedMinutes + " mins"
      : Math.floor(history.totalPlayedMinutes / 60) + " hours " + (history.totalPlayedMinutes % 60) + " mins";
  const weeklyPlayedMinutes = cachedHistories.recentPlayHistories.reduce((time, recentPlayHistory) => {
    return (
      time +
      recentPlayHistory.dailyPlayHistories.reduce((time, dailyHistory) => {
        return time + dailyHistory.totalPlayedMinutes;
      }, 0)
    );
  }, 0);

  return { ...history, weeklyPlayedMinutes, totalPlayTime };
};
const parseHKStoreGameHTML: (html: string) => IGameInformation | undefined = (html) => {
  const regex = /NXSTORE\.titleDetail\.jsonData\s*=\s*({.*?});/;
  const match = html.match(regex);
  const data = match && JSON.parse(match[1]);
  if (!data) {
    return;
  }
  return {
    name: data.applications.formal_name,
    headline: data.catch_copy,
    description: data.description,
    playModes: data.play_styles.map((playStyle: any) => ({ code: playStyle.name })),
    releaseDate: data.release_date_on_eshop,
    romFileSize: data.total_rom_size,
    supportedLanguages: data.languages.map((language: any) => language.name),
    screenshots: data.screenshots.map((screenshot: { images: { url: string }[] }) => {
      return screenshot.images.map((image) => image.url)[0];
    }),
    genres: data.genre.split(" / ").map((label: string) => {
      const genre = GAME_GENERES.find((gameGenre) => gameGenre.label_zh === label);
      return {
        label: genre?.label_zh || label,
        color: genre?.color || Color.PrimaryText,
      };
    }),
    publisher: data.publisher?.name,
  };
};
const parseUSStoreGameHTML: (html: string) => IGameInformation | undefined = (html) => {
  const $ = cheerio.load(html);
  const scriptEl = $("#__NEXT_DATA__");
  const scriptContent = scriptEl.html();
  const data = scriptContent && JSON.parse(scriptContent);
  if (!data?.props?.pageProps?.product) {
    return;
  }
  return {
    name: data.props.pageProps.product.name,
    headline: data.props.pageProps.product.headline,
    description: data.props.pageProps.product.description,
    playModes: data.props.pageProps.product.playModes,
    releaseDate: data.props.pageProps.product.releaseDate,
    romFileSize: data.props.pageProps.product.romFileSize,
    supportedLanguages: data.props.pageProps.product.supportedLanguages,
    screenshots: data.props.pageProps.product.productGallery.map(
      (item: { resourceType: "video" | "image"; publicId: string }) => {
        if (item.resourceType === "image") {
          return "https://assets.nintendo.com/image/upload/" + item.publicId;
        }
      }
    ),
    genres: data.props.pageProps.product.genres.map((genre: any) => {
      const gameGenre = GAME_GENERES.find((gameGenre) => gameGenre.code === genre.code);
      return {
        label: genre.label,
        color: gameGenre?.color || Color.PrimaryText,
      };
    }),
    publisher: data.props.pageProps.product.softwarePublisher || data.props.pageProps.product.softwareDeveloper,
  };
};
const getStoreGameUrl = async (titleId: string, region: "HK" | "US") => {
  const url = `https://ec.nintendo.com/apps/${titleId}/${region}`;
  const redirectUrl = await fetch(url).then((res) => res.url);
  return redirectUrl;
};
const getGameInfo = async (titleId: string, region: "HK" | "US") => {
  const url = await getStoreGameUrl(titleId, region);
  const html = await fetch(url).then((res) => res.text());
  if (region === "HK") {
    return parseHKStoreGameHTML(html);
  }
  if (region === "US") {
    return parseUSStoreGameHTML(html);
  }
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
    keepPreviousData: false,
    initialData: cachedToken,
    onError: (error) => {
      showToast(Toast.Style.Failure, error.name, error.message);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Fetching Token");
    },
    onData: (data) => {
      if (data.access_token !== cachedToken?.access_token) {
        cache.set(data);
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
      onData: (data) => {
        cache.set(data);
        showToast(Toast.Style.Success, "Success");
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
export const useGameInfo = (titleId: string) => {
  const abortable = useRef<AbortController>();
  const retryRef = useRef(0);
  const gameInfo = useCachedPromise(getGameInfo, [titleId, "US"], {
    keepPreviousData: true,
    execute: false,
    abortable,
    onError: (error) => {
      showToast(Toast.Style.Failure, error.name, error.message);
      if (retryRef.current < 3) {
        retryRef.current++;
        gameInfo.revalidate();
      }
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Loading Game Info");
    },
    onData: () => {
      retryRef.current = 0;
      showToast(Toast.Style.Success, "Success");
    },
  });
  useEffect(() => {
    if (!gameInfo.data) {
      gameInfo.revalidate();
    }
  }, []);
  return gameInfo;
};
