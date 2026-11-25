/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { createHash } from "node:crypto";

import { Cache } from "@raycast/api";
import { FetchError } from "ofetch";

import { timedFetch } from "@/shared/http";
import { logSummary, logTrace, logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

const modelCache = new Cache({ namespace: "ai-provider-models" });
const LOG_LABEL = "AI Models";
const PUBLIC_OPENAI_COMPATIBLE_MODELS_ENDPOINTS = new Set([
  "https://opencode.ai/zen/v1/models",
  "https://opencode.ai/zen/go/v1/models",
]);

export function resolveOpenAICompatibleModelDiscovery(endpoint: string, apiKey: string) {
  let url: URL;
  try {
    url = getModelsURL(endpoint);
  } catch (error) {
    return {
      key: `invalid:${endpoint}`,
      canLoad: !!endpoint && !!apiKey,
      getCachedIds: (): string[] => [],
      loadIds: async (): Promise<string[]> => {
        logWarn(LOG_LABEL, `request skipped: invalid endpoint, error type: ${getErrorType(error)}`);
        throw error;
      },
    };
  }

  const modelsURL = url.toString();
  const isPublic = PUBLIC_OPENAI_COMPATIBLE_MODELS_ENDPOINTS.has(modelsURL);
  const credential = isPublic ? "" : apiKey;
  url.username = "";
  url.password = "";
  const safeURL = url.toString();
  const key = createHash("sha256").update(`${safeURL}\n${credential}`).digest("hex");
  return {
    key,
    canLoad: !!credential || isPublic,
    getCachedIds: () => getCachedModelIds(key, safeURL),
    loadIds: (signal?: AbortSignal) => fetchModelIds({ modelsURL, safeURL, key, credential }, signal),
  };
}

async function fetchModelIds(
  { modelsURL, safeURL, key, credential }: { modelsURL: string; safeURL: string; key: string; credential: string },
  signal?: AbortSignal,
): Promise<string[]> {
  logTrace(LOG_LABEL, `request models: ${safeURL}`);
  let value: unknown;
  try {
    value = await timedFetch<unknown>(modelsURL, {
      ...(credential ? { headers: { Authorization: `Bearer ${credential}` } } : {}),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      logTrace(LOG_LABEL, `request cancelled: ${safeURL}`);
      throw error;
    }
    if (error instanceof FetchError) {
      logWarn(LOG_LABEL, `request failed: ${safeURL}, status: ${error.status ?? "unknown"}`);
      if (error.status === 401 || error.status === 403) {
        throw new Error("Authentication failed while fetching models.", { cause: error });
      }
      if (error.status === 404 || error.status === 405) {
        throw new Error("This provider does not expose an OpenAI-compatible models endpoint.", { cause: error });
      }
    } else {
      logWarn(LOG_LABEL, `request failed: ${safeURL}, error type: ${getErrorType(error)}`);
    }
    throw error;
  }

  if (!isRecord(value) || !Array.isArray(value.data)) {
    logWarn(LOG_LABEL, `invalid response shape: ${safeURL}`);
    throw new Error("The models endpoint returned an invalid response.");
  }
  const modelIds = value.data.flatMap((entry) =>
    isRecord(entry) && typeof entry.id === "string" && entry.id.trim() ? [entry.id.trim()] : [],
  );
  if (!modelIds.length) {
    logWarn(LOG_LABEL, `response contains no model IDs: ${safeURL}`);
    throw new Error("The models endpoint returned no usable model IDs.");
  }
  const uniqueModelIds = [...new Set(modelIds)].sort((left, right) => left.localeCompare(right));
  modelCache.set(key, JSON.stringify(uniqueModelIds));
  logSummary(LOG_LABEL, `loaded ${uniqueModelIds.length} models: ${safeURL}`);
  return uniqueModelIds;
}

function getCachedModelIds(key: string, safeURL: string): string[] {
  let cached: unknown;
  try {
    const value = modelCache.get(key);
    if (!value) {
      logTrace(LOG_LABEL, `cache miss: ${safeURL}`);
      return [];
    }
    cached = JSON.parse(value);
  } catch {
    logWarn(LOG_LABEL, `invalid cache entry: ${safeURL}`);
    return [];
  }
  if (!Array.isArray(cached)) {
    logWarn(LOG_LABEL, `invalid cache shape: ${safeURL}`);
    return [];
  }
  const modelIds = [
    ...new Set(cached.filter((model): model is string => typeof model === "string" && model.trim().length > 0)),
  ].sort((left, right) => left.localeCompare(right));
  logTrace(LOG_LABEL, `cache hit: ${modelIds.length} models for ${safeURL}`);
  return modelIds;
}

function getModelsURL(endpoint: string): URL {
  const url = new URL(endpoint);
  url.pathname = `${url.pathname.replace(/\/chat\/completions\/?$/, "").replace(/\/+$/, "")}/models`;
  url.search = "";
  url.hash = "";
  return url;
}

function getErrorType(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}
