/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { LocalStorage } from "@raycast/api";

import { userAgent } from "@/consts";
import { timedFetch } from "@/utils/http";
import { logError, logTrace } from "@/utils/logger";

const youdaoTranslateURL = "https://fanyi.youdao.com";
const youdaoCookieKey = "youdaoCookie";

let youdaoCookie: string | undefined;

/**
 * Get Youdao web cookie from memory, local storage, or fetch it from the web.
 * Cookie will be expired after 1 day.
 */
export async function ensureYoudaoCookie(): Promise<string | undefined> {
  if (youdaoCookie) {
    return youdaoCookie;
  }

  const cookie = await LocalStorage.getItem<string>(youdaoCookieKey);
  if (cookie) {
    youdaoCookie = cookie;
    return youdaoCookie;
  }

  return requestYoudaoWebCookie();
}

/**
 * Fetch youdao cookie from youdao web, and store it in local storage.
 */
export async function requestYoudaoWebCookie(): Promise<string | undefined> {
  logTrace("Youdao Cookie", "start requesting youdao web cookie");

  const headers = {
    "User-Agent": userAgent,
  };

  try {
    const response = await timedFetch.raw(youdaoTranslateURL, { headers });
    const setCookie = response.headers.getSetCookie?.() || [];
    if (setCookie.length > 0) {
      youdaoCookie = setCookie.join(";");
      await LocalStorage.setItem(youdaoCookieKey, youdaoCookie);
      logTrace("Youdao Cookie", "got web youdao cookie");
      return youdaoCookie;
    }
  } catch (error) {
    logError("Youdao Cookie", `get youdao cookie error: ${error}`);
    await LocalStorage.removeItem(youdaoCookieKey);
  }

  return undefined;
}
