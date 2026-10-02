/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { AI } from "@raycast/api";

import { normalizeOpenAICompatibleEndpoint } from "./endpoint";
import type { AIProviderProfile, JSONOutputMode, TokenLimitMode } from "./types";

interface AIProviderRuntimeBase {
  readonly id: string;
  readonly name: string;
}

export interface RaycastAIRuntimeConfig extends AIProviderRuntimeBase {
  readonly adapter: "raycast-ai";
  readonly model: AI.Model;
}

export interface OpenAICompatibleRuntimeConfig extends AIProviderRuntimeBase {
  readonly adapter: "openai-compatible";
  readonly request: {
    readonly baseURL: string;
    readonly model: string;
    readonly apiKey?: string;
  };
  readonly endpoint: URL;
  readonly tokenLimitMode: TokenLimitMode;
  readonly jsonOutputMode: JSONOutputMode;
}

export type AIProviderRuntimeConfig = RaycastAIRuntimeConfig | OpenAICompatibleRuntimeConfig;

type AIProviderRuntimeResolution =
  { kind: "ready"; config: AIProviderRuntimeConfig } | { kind: "issue"; message: string };

export function resolveAIProviderRuntimeConfig(profile: AIProviderProfile): AIProviderRuntimeResolution {
  const name = profile.name.trim();
  if (!name) return { kind: "issue", message: "Enter a provider name." };
  const base = { id: profile.id, name };
  const model = profile.model.trim();
  if (profile.adapter === "raycast-ai") {
    if (!model) return { kind: "issue", message: "Choose a Raycast AI model." };
    const resolvedModel = Object.values(AI.Model).find((candidate) => candidate === model);
    return resolvedModel === undefined
      ? { kind: "issue", message: "Choose an available Raycast AI model." }
      : { kind: "ready", config: { ...base, adapter: profile.adapter, model: resolvedModel } };
  }

  if (!model) return { kind: "issue", message: "Enter a model." };
  if (!profile.endpoint.trim()) return { kind: "issue", message: "Enter an API base URL." };
  const baseURL = normalizeOpenAICompatibleEndpoint(profile.endpoint);
  let endpoint: URL;
  try {
    endpoint = new URL(baseURL);
    if ((endpoint.protocol !== "https:" && endpoint.protocol !== "http:") || !endpoint.hostname) {
      throw new Error("Invalid endpoint");
    }
  } catch {
    return { kind: "issue", message: "Enter a valid HTTP or HTTPS API base URL." };
  }
  const apiKey = profile.apiKey.trim();
  return {
    kind: "ready",
    config: {
      ...base,
      adapter: profile.adapter,
      request: { baseURL, model, ...(apiKey ? { apiKey } : {}) },
      endpoint,
      tokenLimitMode: profile.tokenLimitMode,
      jsonOutputMode: profile.jsonOutputMode,
    },
  };
}
