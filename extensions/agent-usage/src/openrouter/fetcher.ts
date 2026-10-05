import { httpFetch } from "../agents/http.ts";
import type { OpenRouterError, OpenRouterUsage } from "./types.ts";

const OPENROUTER_CREDITS_API = "https://openrouter.ai/api/v1/credits";
const OPENROUTER_KEY_API = "https://openrouter.ai/api/v1/key";
const UNAUTHORIZED_MESSAGE = "OpenRouter API key expired or invalid. Please update it in extension settings.";

interface OpenRouterCreditsResponse {
  data?: {
    total_credits?: unknown;
    total_usage?: unknown;
  };
}

interface OpenRouterKeyResponse {
  data?: {
    label?: unknown;
    limit?: unknown;
    limit_remaining?: unknown;
    usage?: unknown;
    is_free_tier?: unknown;
  };
}

function parseError(message: string): { usage: null; error: OpenRouterError } {
  return { usage: null, error: { type: "parse_error", message } };
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Account-wide ledger from `/credits` — only readable with a provisioning (management) key. */
export function parseOpenRouterCredits(data: unknown): {
  usage: OpenRouterUsage | null;
  error: OpenRouterError | null;
} {
  if (!data || typeof data !== "object") {
    return parseError("Invalid OpenRouter API response format");
  }

  const payload = (data as OpenRouterCreditsResponse).data;
  if (!payload || typeof payload !== "object") {
    return parseError("Missing OpenRouter credit data");
  }

  const totalCredits = payload.total_credits;
  const totalUsage = payload.total_usage;
  if (
    typeof totalCredits !== "number" ||
    !Number.isFinite(totalCredits) ||
    typeof totalUsage !== "number" ||
    !Number.isFinite(totalUsage)
  ) {
    return parseError("Invalid numeric value in OpenRouter credit data");
  }

  return {
    usage: {
      source: "account",
      totalCredits,
      totalUsage,
      remaining: totalCredits - totalUsage,
    },
    error: null,
  };
}

/** Key-scoped spending cap from `/key` — the fallback for a regular inference key. */
export function parseOpenRouterKey(data: unknown): { usage: OpenRouterUsage | null; error: OpenRouterError | null } {
  if (!data || typeof data !== "object") {
    return parseError("Invalid OpenRouter API response format");
  }

  const payload = (data as OpenRouterKeyResponse).data;
  if (!payload || typeof payload !== "object") {
    return parseError("Missing OpenRouter key data");
  }

  const usageValue = payload.usage;
  if (typeof usageValue !== "number" || !Number.isFinite(usageValue)) {
    return parseError("Invalid numeric value in OpenRouter key data");
  }

  const limit = optionalNumber(payload.limit);
  const limitRemaining = optionalNumber(payload.limit_remaining);
  if (limit === undefined || limitRemaining === undefined) {
    return parseError("Invalid numeric value in OpenRouter key data");
  }

  return {
    usage: {
      source: "key",
      totalCredits: limit,
      totalUsage: usageValue,
      remaining: limitRemaining ?? (limit === null ? null : limit - usageValue),
      label: typeof payload.label === "string" && payload.label ? payload.label : undefined,
      isFreeTier: typeof payload.is_free_tier === "boolean" ? payload.is_free_tier : undefined,
    },
    error: null,
  };
}

export async function fetchOpenRouterUsage(
  apiKey: string,
): Promise<{ usage: OpenRouterUsage | null; error: OpenRouterError | null }> {
  const credits = await httpFetch({
    url: OPENROUTER_CREDITS_API,
    token: apiKey,
    headers: { Accept: "application/json" },
    unauthorizedMessage: UNAUTHORIZED_MESSAGE,
  });
  if (!credits.error) return parseOpenRouterCredits(credits.data);
  if (credits.error.type === "network_error") return { usage: null, error: credits.error };

  // `/credits` needs a provisioning key; a regular inference key is rejected there but can still
  // report its own spending cap through `/key`.
  const key = await httpFetch({
    url: OPENROUTER_KEY_API,
    token: apiKey,
    headers: { Accept: "application/json" },
    unauthorizedMessage: UNAUTHORIZED_MESSAGE,
  });
  if (key.error) return { usage: null, error: key.error };
  return parseOpenRouterKey(key.data);
}
