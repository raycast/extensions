import got, { type OptionsOfJSONResponseBody } from "got";
import { Cache } from "@raycast/api";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com/",
  Origin: "https://www.bilibili.com",
};

function buildHeaders(extra?: Record<string, string>) {
  const cache = new Cache();
  const cookie = cache.get("cookie");

  return {
    ...BASE_HEADERS,
    ...(cookie ? { cookie } : {}),
    ...(extra ?? {}),
  } as Record<string, string>;
}

export async function getJson<T>(url: string, options: OptionsOfJSONResponseBody = {}) {
  const headers = buildHeaders(options.headers as Record<string, string> | undefined);
  return got(url, { ...options, headers }).json<T>();
}
