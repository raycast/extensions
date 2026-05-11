import { getPreferenceValues, Cache } from "@raycast/api";
import assert from "node:assert";
import fetch from "cross-fetch";
import { URLSearchParams } from "url";
import { BASE_URL, USER_AGENT } from "../constants";

const cache = new Cache();

export function getApiKey(): string {
  const { apiKey } = getPreferenceValues();

  // required in manifest so this shouldn't be possible
  assert(apiKey, "api key missing");

  return apiKey;
}

export async function withCache<T>(key: string, callback: () => Promise<T>): Promise<T> {
  const cacheKey = `${getApiKey()}:${key}`;

  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const res = await callback();
  cache.set(cacheKey, JSON.stringify(res));

  return res;
}

export async function apiRequest({
  endpoint,
  method = "GET",
  body,
  query = {},
}: {
  endpoint: string;
  method?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}): Promise<{ status: number; data: any }> {
  const signal = AbortSignal.timeout(5 * 1000);
  const apiKey = getApiKey();

  try {
    const queryParams = new URLSearchParams(query);
    const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

    const res = await fetch(url, {
      signal,
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      if (res.status === 401) {
        const { message } = await res.json();
        throw new Error(`Unauthorized. ${message}`);
      }
      if (res.status === 403) {
        const { message } = await res.json();
        throw new Error(`Permission error. ${message}`);
      }

      console.warn("Api response", await res.text());
      throw new Error(`Error from Humaans api (${res.status}). Please try again later`);
    }

    return {
      status: res.status,
      data: await res.json(),
    };
  } catch (e) {
    if (e && typeof e === "object" && "name" in e && e.name === "AbortError") {
      throw new Error("Timed out. Please try again later");
    }

    console.error(e);
    throw e;
  }
}
