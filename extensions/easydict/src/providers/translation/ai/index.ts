/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile } from "@/ai-providers/types";

import type { BaseTranslateProvider } from "../base";
import { ConfiguredOpenAICompatibleTranslateProvider } from "./openai-compatible";
import { RaycastAITranslateProvider } from "./raycast-ai";

export function createAITranslationProvider(profile: AIProviderProfile): BaseTranslateProvider {
  return profile.adapter === "raycast-ai"
    ? new RaycastAITranslateProvider(profile)
    : new ConfiguredOpenAICompatibleTranslateProvider(profile);
}
