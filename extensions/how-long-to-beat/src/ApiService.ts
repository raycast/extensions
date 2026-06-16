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
  private static userAgent: string = new UserAgent().toString();

  private static getDefaultHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      origin: HLTB_BASE_URL,
      referer: HLTB_BASE_URL,
      "User-Agent": this.userAgent,
    };
  }

  public static async getAuthToken(query: string): Promise<TokenCache> {
    const cachedToken = cache.get("hltb_auth_token");
    if (cachedToken) {
      const parsed = JSON.parse(cachedToken) as TokenCache;
      if (Date.now() - parsed.timestamp < TOKEN_CACHE_DURATION_MS && parsed.hpKey && parsed.hpVal && parsed.userAgent) {
        this.userAgent = parsed.userAgent;
        return parsed;
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
      this.userAgent = new UserAgent().toString();
      throw new Error(`Failed to get auth token: ${response.statusText}`);
    }

    const data = (await response.json()) as { token: string; hpKey: string; hpVal: string };

    const newToken: TokenCache = {
      value: data.token,
      hpKey: data.hpKey,
      hpVal: data.hpVal,
      userAgent: this.userAgent,
      timestamp: Date.now(),
    };

    cache.set("hltb_auth_token", JSON.stringify(newToken));
    this.tokenCache = newToken;

    return newToken;
  }

  public static async postWithAuth<T>(
    url: string,
    data: unknown,
    query: string,
    config?: FetchConfig,
  ): Promise<{ data: T }> {
    const auth = await this.getAuthToken(query);

    const controller = config?.signal ? null : new AbortController();
    const timeoutId = config?.timeout && controller ? setTimeout(() => controller.abort(), config.timeout) : null;

    const absoluteUrl = new URL(url, HLTB_BASE_URL).href;

    try {
      const response = await fetch(absoluteUrl, {
        method: "POST",
        headers: {
          ...this.getDefaultHeaders(),
          ...config?.headers,
          "x-auth-token": auth.value,
          "x-hp-key": auth.hpKey,
          "x-hp-val": auth.hpVal,
        },
        body: JSON.stringify({ ...(data as Record<string, unknown>), [auth.hpKey]: auth.hpVal }),
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
