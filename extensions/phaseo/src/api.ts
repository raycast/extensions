import { Cache, getPreferenceValues } from "@raycast/api";
import type { Preferences, ModelsResponse, ModelFilters } from "./types";

const DEFAULT_API_URL = "https://api.phaseo.app/v1";
const LEGACY_API_URL = "https://api.phaseo.app/v1";
const apiCache = new Cache({ namespace: "phaseo-api" });

const CACHE_TTL = {
  models: 60 * 60 * 1000,
} as const;

type CachedResponse<T> = {
  expiresAt: number;
  value: T;
};

function getCacheKey(apiKey: string, url: string): string {
  let hash = 2166136261;
  const input = `${apiKey}:${url}`;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "APIError";
  }
}

function getAPIConfig(): { apiKey: string; apiUrl: string } {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  const configuredApiUrl = preferences.apiUrl?.trim().replace(/\/+$/, "");
  const apiUrl =
    configuredApiUrl === LEGACY_API_URL
      ? DEFAULT_API_URL
      : configuredApiUrl || DEFAULT_API_URL;

  if (!apiKey) {
    throw new APIError(
      "API key is required. Please configure it in extension preferences.",
    );
  }

  return { apiKey, apiUrl };
}

async function fetchAPI<T>(
  endpoint: string,
  params?: Record<string, string | string[]>,
  cacheTtlMs = 0,
): Promise<T> {
  const { apiKey, apiUrl } = getAPIConfig();

  // Build query string
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v));
      } else {
        queryParams.append(key, value);
      }
    });
  }

  const url = `${apiUrl}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const cacheKey = getCacheKey(apiKey, url);

  if (cacheTtlMs > 0) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      try {
        const entry = JSON.parse(cached) as CachedResponse<T>;
        if (entry.expiresAt > Date.now()) return entry.value;
      } catch {
        apiCache.remove(cacheKey);
      }
    }
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new APIError(
          "Invalid API key. Please check your extension preferences.",
          401,
        );
      }
      if (response.status === 403) {
        throw new APIError(
          "Access forbidden. Please check your API key permissions.",
          403,
        );
      }
      if (response.status === 404) {
        throw new APIError("Endpoint not found.", 404);
      }
      throw new APIError(
        `API request failed with status ${response.status}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      ok?: boolean;
      message?: string;
    } & T;

    if (data.ok === false) {
      throw new APIError(data.message || "API request failed");
    }

    if (cacheTtlMs > 0) {
      apiCache.set(
        cacheKey,
        JSON.stringify({ expiresAt: Date.now() + cacheTtlMs, value: data }),
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new APIError(`Network error: ${error.message}`);
    }
    throw new APIError("Unknown error occurred");
  }
}

export async function getModels(
  limit = 50,
  offset = 0,
  filters?: ModelFilters,
): Promise<ModelsResponse> {
  const params: Record<string, string | string[]> = {
    limit: String(limit),
    offset: String(offset),
  };

  if (filters) {
    if (filters.endpoints) params.endpoints = filters.endpoints;
    if (filters.organisation) params.organisation = filters.organisation;
    if (filters.input_types) params.input_types = filters.input_types;
    if (filters.output_types) params.output_types = filters.output_types;
    if (filters.params) params.params = filters.params;
  }

  return fetchAPI<ModelsResponse>("/models", params, CACHE_TTL.models);
}

export function clearAPICache(): void {
  apiCache.clear();
}
