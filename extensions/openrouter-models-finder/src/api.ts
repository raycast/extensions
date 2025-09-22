import { Cache } from "@raycast/api";

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  created: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    max_completion_tokens?: number;
  };
}

export interface OpenRouterResponse {
  data: OpenRouterModel[];
}

const cache = new Cache();
const CACHE_KEY = "openrouter-models";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache TTL
const TOKENS_PER_MILLION = 1000000; // Used for price formatting

export interface CachedData {
  models: OpenRouterModel[];
  timestamp: number;
}

export function getCachedModels(): OpenRouterModel[] | null {
  const cached = cache.get(CACHE_KEY);
  if (!cached) return null;

  try {
    const data = JSON.parse(cached) as CachedData;
    const now = Date.now();

    // Check if cache is expired
    if (now - data.timestamp > CACHE_TTL) {
      return null;
    }

    return data.models;
  } catch {
    return null;
  }
}

export function setCachedModels(models: OpenRouterModel[]): void {
  const data: CachedData = {
    models,
    timestamp: Date.now(),
  };
  cache.set(CACHE_KEY, JSON.stringify(data));
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 503 || response.status === 502) {
        throw new Error("OpenRouter service is temporarily unavailable");
      } else if (response.status === 429) {
        throw new Error("Too many requests, please try again later");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const models = data.data || [];

    // Cache the data
    setCachedModels(models);

    return models;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout - please check your network connection",
        );
      } else if (
        "code" in error &&
        (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED")
      ) {
        throw new Error(
          "Network error - please check your internet connection",
        );
      } else if (error.message?.includes("fetch")) {
        throw new Error("Network error - unable to connect to OpenRouter");
      }
    }

    throw error;
  }
}

export function formatModelPrice(prompt: string, completion: string): string {
  const promptPrice = parseFloat(prompt) * TOKENS_PER_MILLION;
  const completionPrice = parseFloat(completion) * TOKENS_PER_MILLION;
  return `$${promptPrice.toFixed(2)}/$${completionPrice.toFixed(2)} per 1M tokens`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000000000) {
    // B (Billion) units
    const value = tokens / 1000000000;
    if (value >= 100) {
      return `${value.toFixed(0)}B tokens`;
    } else if (value >= 10) {
      return `${value.toFixed(1)}B tokens`;
    } else {
      return `${value.toFixed(2)}B tokens`;
    }
  } else if (tokens >= 1000000) {
    // M (Million) units
    const value = tokens / 1000000;
    if (value >= 100) {
      return `${value.toFixed(0)}M tokens`;
    } else if (value >= 10) {
      return `${value.toFixed(1)}M tokens`;
    } else {
      return `${value.toFixed(2)}M tokens`;
    }
  } else if (tokens >= 1000) {
    // K (Thousand) units
    return `${(tokens / 1000).toFixed(0)}K tokens`;
  } else {
    return `${tokens} tokens`;
  }
}
