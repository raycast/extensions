import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import UserAgent from "user-agents";
import { HLTB_BASE_URL, HLTB_API_SEARCH_INIT_ENDPOINT, TOKEN_CACHE_DURATION_MS } from "./constants";
import type { TokenCache } from "./types";

export class ApiService {
  private static instance: AxiosInstance;
  private static tokenCache: TokenCache | null = null;

  public static getInstance(): AxiosInstance {
    if (!this.instance) {
      this.instance = axios.create({
        baseURL: HLTB_BASE_URL,
        headers: {
          "content-type": "application/json",
          origin: HLTB_BASE_URL,
          referer: HLTB_BASE_URL,
          "User-Agent": new UserAgent().toString(),
        },
      });
    }
    return this.instance;
  }

  public static async getAuthToken(query: string): Promise<string> {
    if (this.tokenCache && Date.now() - this.tokenCache.timestamp < TOKEN_CACHE_DURATION_MS) {
      return this.tokenCache.value;
    }

    try {
      const response = await this.getInstance().get<{ token: string }>(
        `${HLTB_API_SEARCH_INIT_ENDPOINT}?t=${Date.now()}`,
        {
          headers: {
            referer: `${HLTB_BASE_URL}?q=${query}`,
          },
        },
      );

      this.tokenCache = {
        value: response.data.token,
        timestamp: Date.now(),
      };

      return this.tokenCache.value;
    } catch {
      throw new Error("failed to fetch auth token");
    }
  }

  public static async postWithAuth<T>(
    url: string,
    data: unknown,
    query: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const token = await this.getAuthToken(query);
    return this.getInstance().post(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        "x-auth-token": token,
      },
    });
  }
}
