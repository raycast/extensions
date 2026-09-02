/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { createHash } from "node:crypto";

import { AI } from "@raycast/api";

import {
  fetchOpenAICompatibleModelIds,
  getCachedOpenAICompatibleModelIds,
  isPublicOpenAICompatibleModelsEndpoint,
} from "./modelDiscovery";
import type { AIProviderProfile, OpenAICompatibleProfile } from "./types";

export interface AIModelOption {
  title: string;
  value: string;
}

export interface ResolvedAIModelCatalog {
  allowsCustomModel: boolean;
  loadKey?: string;
  getCachedOptions(): AIModelOption[];
  loadOptions(signal?: AbortSignal): Promise<AIModelOption[]>;
}

export function resolveAIProviderModelCatalog(profile: AIProviderProfile): ResolvedAIModelCatalog {
  switch (profile.adapter) {
    case "raycast-ai":
      return resolveRaycastAIModelCatalog();
    case "openai-compatible":
      return resolveOpenAICompatibleModelCatalog(profile);
  }
}

export function getDefaultRaycastAIModel(): string {
  return AI.Model["OpenAI_GPT-5_mini"];
}

function resolveRaycastAIModelCatalog(): ResolvedAIModelCatalog {
  const options = getRaycastAIModelOptions();
  return {
    allowsCustomModel: false,
    loadKey: "raycast-ai",
    getCachedOptions: () => options,
    loadOptions: async () => options,
  };
}

function resolveOpenAICompatibleModelCatalog(profile: OpenAICompatibleProfile): ResolvedAIModelCatalog {
  const endpoint = profile.endpoint.trim();
  const apiKey = profile.apiKey.trim();
  const isPublicModelsEndpoint = isPublicOpenAICompatibleModelsEndpoint(endpoint);
  const normalize = getOpenAICompatibleModelIdNormalizer(endpoint);
  const toOptions = (modelIds: string[]) =>
    [...new Set(modelIds.map(normalize).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ title: value, value }));

  return {
    allowsCustomModel: true,
    loadKey:
      endpoint && (apiKey || isPublicModelsEndpoint)
        ? getRemoteCatalogLoadKey(endpoint, isPublicModelsEndpoint ? "" : apiKey)
        : undefined,
    getCachedOptions: () => (endpoint ? toOptions(getCachedOpenAICompatibleModelIds(endpoint, apiKey)) : []),
    loadOptions: async (signal) => toOptions(await fetchOpenAICompatibleModelIds(endpoint, apiKey, signal)),
  };
}

function getRaycastAIModelOptions(): AIModelOption[] {
  const seen = new Set<string>();
  return Object.entries(AI.Model).flatMap(([title, value]) => {
    if (seen.has(value)) return [];
    seen.add(value);
    return [{ title: title.replaceAll("_", " "), value }];
  });
}

function getOpenAICompatibleModelIdNormalizer(endpoint: string): (modelId: string) => string {
  return isOfficialGeminiOpenAIEndpoint(endpoint)
    ? (modelId) => modelId.replace(/^models\//, "")
    : (modelId) => modelId;
}

function isOfficialGeminiOpenAIEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.hostname === "generativelanguage.googleapis.com" && /\/openai\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function getRemoteCatalogLoadKey(endpoint: string, apiKey: string): string {
  return createHash("sha256").update(`${endpoint}\n${apiKey}`).digest("hex");
}
