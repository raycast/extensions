import axios from "axios";
import { URL_ENDPOINTS } from "../constants/endpoints";
import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { CacheAdapter } from "./cache";

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

export interface ApiParams {
  [key: string]: string | number | string[] | PublicKey;
}

/**
 * Creates a cache key from method and params for consistent caching
 */
function createCacheKey(method: string, params: ApiParams): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (result, key) => {
        const value = params[key];
        // Handle PublicKey serialization
        result[key] = value instanceof PublicKey ? value.toString() : value;
        return result;
      },
      {} as Record<string, unknown>,
    );

  return `api_${method}_${JSON.stringify(sortedParams)}`;
}

/**
 * Executes an API action with optional caching
 */
export async function executeAction<T>(
  method: string,
  params: ApiParams = {},
  useCache = false,
  cacheTimeMs?: number,
): Promise<ApiResponse<T>> {
  let cache: CacheAdapter | null = null;

  // Handle caching if enabled
  if (useCache) {
    const cacheKey = createCacheKey(method, params);
    cache = new CacheAdapter(cacheKey);

    const cachedResult = cache.get<ApiResponse<T>>();
    if (cachedResult) {
      return cachedResult;
    }
  }

  try {
    const token = await LocalStorage.getItem<string>(STORAGE_KEYS.BACKEND_SESSION_TOKEN);

    if (!token) {
      throw new Error("Authentication token not found. Please sign in again.");
    }

    const response = await axios.post<ApiResponse<T>>(
      `${URL_ENDPOINTS.SEND_AI_API_URL}/execute.action`,
      { method, params },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // Handle error responses from the API
    if (response.data.status === "error") {
      throw new Error(response.data.message || "API request failed");
    }

    // Cache successful results if caching is enabled
    if (useCache && cache && response.data.status === "success") {
      const cacheTime = cacheTimeMs || 2 * 60 * 1000; // Default 2 minutes
      cache.set(response.data, cacheTime);
    }

    return response.data;
  } catch (error) {
    // Handle axios errors with backend responses
    if (axios.isAxiosError(error)) {
      const backendError = error.response?.data;

      if (backendError?.status === "error" && backendError.message) {
        throw new Error(backendError.message);
      }

      if (backendError?.message) {
        throw new Error(backendError.message);
      }

      // Handle specific HTTP status codes
      if (error.response?.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      }

      if (error.response?.status && error.response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }
    }

    // Preserve original error message if it's already an Error
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unexpected error occurred");
  }
}
