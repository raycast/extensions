/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderRuntimeConfig } from "@/providers/profiles/runtime";

import type { BaseTranslateProvider } from "../base";
import { ConfiguredOpenAICompatibleTranslateProvider } from "./openai-compatible";
import { RaycastAITranslateProvider } from "./raycast-ai";

export function createAITranslationProvider(config: AIProviderRuntimeConfig): BaseTranslateProvider {
  return config.adapter === "raycast-ai"
    ? new RaycastAITranslateProvider(config)
    : new ConfiguredOpenAICompatibleTranslateProvider(config);
}
