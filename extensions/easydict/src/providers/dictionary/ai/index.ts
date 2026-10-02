/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderRuntimeConfig } from "@/providers/profiles/runtime";

import type { BaseDictionaryProvider } from "../base";
import { type NativeJSONUnsupportedHandler, OpenAICompatibleDictionaryProvider } from "./openai-compatible";
import { RaycastAIDictionaryProvider } from "./raycast-ai";

export function createAIDictionaryProvider(
  config: AIProviderRuntimeConfig,
  onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
): BaseDictionaryProvider {
  return config.adapter === "raycast-ai"
    ? new RaycastAIDictionaryProvider(config)
    : new OpenAICompatibleDictionaryProvider(config, onNativeJSONUnsupported);
}

export type { NativeJSONUnsupportedHandler };
