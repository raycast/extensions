/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIWordResult } from "@/ai-providers/dictionary/types";
import type { AIProviderProfile } from "@/ai-providers/types";

import type { BaseDictionaryProvider } from "../base";
import { type NativeJSONUnsupportedHandler, OpenAICompatibleDictionaryProvider } from "./openai-compatible";
import { RaycastAIDictionaryProvider } from "./raycast-ai";

export function createAIDictionaryProvider(
  profile: AIProviderProfile,
  onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
): BaseDictionaryProvider<AIWordResult> {
  return profile.adapter === "raycast-ai"
    ? new RaycastAIDictionaryProvider(profile)
    : new OpenAICompatibleDictionaryProvider(profile, onNativeJSONUnsupported);
}

export type { NativeJSONUnsupportedHandler };
