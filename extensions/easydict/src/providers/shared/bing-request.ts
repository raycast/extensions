/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { userAgent } from "@/consts";
import { timedFetch } from "@/shared/http";

import { ensureBingConfig, getBingHost, incrementBingConfigCount } from "./bing-config";

export async function requestBing({
  text,
  fromLang,
  to,
  signal,
}: {
  text: string;
  fromLang: string;
  to: string;
  signal?: AbortSignal;
}): Promise<{ url: string; data: unknown }> {
  const { IG, key, token } = await ensureBingConfig();
  const IID = incrementBingConfigCount();
  const url = `https://${getBingHost()}/ttranslatev3?isVertical=1&IG=${IG}&IID=${IID}`;
  const body = new URLSearchParams({ text, fromLang, to, token, key }).toString();

  return postBing(url, body, signal);
}

async function postBing(url: string, body: string, signal?: AbortSignal): Promise<{ url: string; data: unknown }> {
  const response = await timedFetch.raw(url, {
    method: "POST",
    body,
    headers: {
      "User-Agent": userAgent,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: "manual",
    signal,
  });

  // Follow redirects explicitly so every hop keeps the form body and POST method.
  if (response.status >= 300 && response.status < 400) {
    const redirectUrl = response.headers.get("location");
    if (redirectUrl) return postBing(redirectUrl, body, signal);
  }

  return { url: response.url, data: response._data };
}
