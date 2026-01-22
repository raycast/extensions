import { Cache } from "@raycast/api";
import UserAgent from "user-agents";
import { HLTB_BASE_URL, HLTB_API_SEARCH_INIT_ENDPOINT, TOKEN_CACHE_DURATION_MS } from "./constants";
import type { TokenCache } from "./types";

interface FetchConfig {
  timeout?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const cache = new Cache();

export class ApiService {
  private static tokenCache: TokenCache | null = null;

  private static getDefaultHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      origin: HLTB_BASE_URL,
      referer: HLTB_BASE_URL,
      "User-Agent": new UserAgent().toString(),
    };
  }

  public static async getAuthToken(query: string): Promise<string> {
    const cachedToken = cache.get("hltb_auth_token");
    if (cachedToken) {
      const parsed = JSON.parse(cachedToken) as TokenCache;
      if (Date.now() - parsed.timestamp < TOKEN_CACHE_DURATION_MS) {
        return parsed.value;
      }
    }

    const initUrl = new URL(HLTB_API_SEARCH_INIT_ENDPOINT, HLTB_BASE_URL);
    initUrl.searchParams.set("t", Date.now().toString());

    const response = await fetch(initUrl.href, {
      headers: {
        ...this.getDefaultHeaders(),
        referer: `${HLTB_BASE_URL}?q=${query}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get auth token: ${response.statusText}`);
    }

    const data = (await response.json()) as { token: string };

    const newToken: TokenCache = {
      value: data.token,
      timestamp: Date.now(),
    };

    cache.set("hltb_auth_token", JSON.stringify(newToken));
    this.tokenCache = newToken;

    return newToken.value;
  }

  public static async postWithAuth<T>(
    url: string,
    data: unknown,
    query: string,
    config?: FetchConfig,
  ): Promise<{ data: T }> {
    const token = await this.getAuthToken(query);

    const controller = config?.signal ? null : new AbortController();
    const timeoutId = config?.timeout && controller ? setTimeout(() => controller.abort(), config.timeout) : null;

    const absoluteUrl = new URL(url, HLTB_BASE_URL).href;

    try {
      const response = await fetch(absoluteUrl, {
        method: "POST",
        headers: {
          ...this.getDefaultHeaders(),
          ...config?.headers,
          "x-auth-token": token,
        },
        body: JSON.stringify(data),
        signal: config?.signal || controller?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const responseData = (await response.json()) as T;
      return { data: responseData };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }
}
