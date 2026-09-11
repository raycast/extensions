/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { createHash } from "node:crypto";

import { Cache } from "@raycast/api";
import { FetchError } from "ofetch";

import { timedFetch } from "@/utils/http";
import { logSummary, logTrace, logWarn } from "@/utils/logger";

const modelCache = new Cache({ namespace: "ai-provider-models" });
const LOG_LABEL = "AI Models";
const PUBLIC_OPENAI_COMPATIBLE_MODELS_ENDPOINTS = new Set([
  "https://opencode.ai/zen/v1/models",
  "https://opencode.ai/zen/go/v1/models",
]);

export async function fetchOpenAICompatibleModelIds(
  endpoint: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  let modelsURL: URL;
  try {
    modelsURL = getModelsURL(endpoint);
  } catch (error) {
    logWarn(LOG_LABEL, `request skipped: invalid endpoint, error type: ${getErrorType(error)}`);
    throw error;
  }
  const safeModelsURL = getSafeURLForLog(modelsURL);
  logTrace(LOG_LABEL, `request models: ${safeModelsURL}`);
  const isPublicModelsEndpoint = isPublicOpenAICompatibleModelsEndpoint(endpoint);

  let value: unknown;
  try {
    value = await timedFetch<unknown>(modelsURL.toString(), {
      ...(!isPublicModelsEndpoint && apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      logTrace(LOG_LABEL, `request cancelled: ${safeModelsURL}`);
      throw error;
    }
    if (error instanceof FetchError) {
      logWarn(LOG_LABEL, `request failed: ${safeModelsURL}, status: ${error.status ?? "unknown"}`);
      if (error.status === 401 || error.status === 403) {
        throw new Error("Authentication failed while fetching models.", { cause: error });
      }
      if (error.status === 404 || error.status === 405) {
        throw new Error("This provider does not expose an OpenAI-compatible models endpoint.", { cause: error });
      }
    } else {
      logWarn(LOG_LABEL, `request failed: ${safeModelsURL}, error type: ${getErrorType(error)}`);
    }
    throw error;
  }

  if (!isRecord(value) || !Array.isArray(value.data)) {
    logWarn(LOG_LABEL, `invalid response shape: ${safeModelsURL}`);
    throw new Error("The models endpoint returned an invalid response.");
  }
  const modelIds = value.data.flatMap((entry) =>
    isRecord(entry) && typeof entry.id === "string" && entry.id.trim() ? [entry.id.trim()] : [],
  );
  if (!modelIds.length) {
    logWarn(LOG_LABEL, `response contains no model IDs: ${safeModelsURL}`);
    throw new Error("The models endpoint returned no usable model IDs.");
  }
  const uniqueModelIds = [...new Set(modelIds)].sort((left, right) => left.localeCompare(right));
  modelCache.set(getModelsCacheKey(endpoint, apiKey), JSON.stringify(uniqueModelIds));
  logSummary(LOG_LABEL, `loaded ${uniqueModelIds.length} models: ${safeModelsURL}`);
  return uniqueModelIds;
}

export function getCachedOpenAICompatibleModelIds(endpoint: string, apiKey: string): string[] {
  let cached: unknown;
  try {
    const value = modelCache.get(getModelsCacheKey(endpoint, apiKey));
    if (!value) {
      logTrace(LOG_LABEL, `cache miss: ${getSafeModelsURLForLog(endpoint)}`);
      return [];
    }
    cached = JSON.parse(value);
  } catch {
    logWarn(LOG_LABEL, `invalid cache entry: ${getSafeModelsURLForLog(endpoint)}`);
    return [];
  }
  if (!Array.isArray(cached)) {
    logWarn(LOG_LABEL, `invalid cache shape: ${getSafeModelsURLForLog(endpoint)}`);
    return [];
  }
  const modelIds = [
    ...new Set(cached.filter((model): model is string => typeof model === "string" && model.trim().length > 0)),
  ].sort((left, right) => left.localeCompare(right));
  logTrace(LOG_LABEL, `cache hit: ${modelIds.length} models for ${getSafeModelsURLForLog(endpoint)}`);
  return modelIds;
}

export function getModelsURL(endpoint: string): URL {
  const url = new URL(endpoint);
  url.pathname = `${url.pathname.replace(/\/chat\/completions\/?$/, "").replace(/\/+$/, "")}/models`;
  url.search = "";
  url.hash = "";
  return url;
}

export function isPublicOpenAICompatibleModelsEndpoint(endpoint: string): boolean {
  try {
    return PUBLIC_OPENAI_COMPATIBLE_MODELS_ENDPOINTS.has(getModelsURL(endpoint).toString());
  } catch {
    return false;
  }
}

function getModelsCacheKey(endpoint: string, apiKey: string): string {
  const normalizedURL = getModelsURL(endpoint);
  normalizedURL.username = "";
  normalizedURL.password = "";
  const cacheCredential = isPublicOpenAICompatibleModelsEndpoint(endpoint) ? "" : apiKey;
  return createHash("sha256").update(`${normalizedURL.toString()}\n${cacheCredential}`).digest("hex");
}

function getSafeURLForLog(url: URL): string {
  const safeURL = new URL(url);
  safeURL.username = "";
  safeURL.password = "";
  return safeURL.toString();
}

function getSafeModelsURLForLog(endpoint: string): string {
  try {
    return getSafeURLForLog(getModelsURL(endpoint));
  } catch {
    return "invalid endpoint";
  }
}

function getErrorType(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
