/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { AI } from "@raycast/api";

import type { AIProviderProfile, OpenAICompatibleProfile } from "@/providers/profiles/types";

import {
  fetchOpenAICompatibleModelIds,
  getCachedOpenAICompatibleModelIds,
  getModelsCacheKey,
  isPublicOpenAICompatibleModelsEndpoint,
} from "./modelDiscovery";

export interface AIModelOption {
  title: string;
  value: string;
}

interface ResolvedAIModelCatalog {
  allowsCustomModel: boolean;
  key: string;
  canLoad: boolean;
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
    key: "raycast-ai",
    canLoad: true,
    getCachedOptions: () => options,
    loadOptions: async () => options,
  };
}

function resolveOpenAICompatibleModelCatalog(profile: OpenAICompatibleProfile): ResolvedAIModelCatalog {
  const endpoint = profile.endpoint.trim();
  const apiKey = profile.apiKey.trim();
  const isPublicModelsEndpoint = isPublicOpenAICompatibleModelsEndpoint(endpoint);
  let key: string;
  try {
    key = getModelsCacheKey(endpoint, apiKey);
  } catch {
    // Invalid edits have no cache identity, but still need request error feedback.
    key = `invalid:${endpoint}`;
  }
  const normalize = getOpenAICompatibleModelIdNormalizer(endpoint);
  const toOptions = (modelIds: string[]) =>
    [...new Set(modelIds.map(normalize).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ title: value, value }));

  return {
    allowsCustomModel: true,
    key,
    canLoad: !!endpoint && (!!apiKey || isPublicModelsEndpoint),
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
