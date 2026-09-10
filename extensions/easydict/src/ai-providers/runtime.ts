/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { AI } from "@raycast/api";

import type { QueryInput } from "@/types/query";

import { isAIDictionaryCandidate } from "./dictionary/candidate";
import { getAIProviderProfileValidationError } from "./profile";
import type { AIProviderProfile, ProviderIconConfig } from "./types";

export type AIProviderQueryMode = "translation" | "dictionary";

export function getRaycastAIModel(value: string): AI.Model | undefined {
  return Object.values(AI.Model).find((model) => model === value);
}

export function isAIProviderProfileRunnable(profile: AIProviderProfile): boolean {
  if (getAIProviderProfileValidationError(profile)) return false;
  if (profile.adapter === "raycast-ai") {
    return getRaycastAIModel(profile.model) !== undefined;
  }
  return true;
}

export function resolveAIProviderIcon(profile: AIProviderProfile): ProviderIconConfig {
  if (profile.icon.kind !== "favicon" || profile.icon.website || profile.adapter !== "openai-compatible") {
    return profile.icon;
  }
  return { kind: "favicon", website: profile.website ?? profile.endpoint };
}

export function getAIProviderQueryMode(
  profile: AIProviderProfile,
  queryWordInfo: QueryInput,
): AIProviderQueryMode | undefined {
  if (!profile.enabled || !isAIProviderProfileRunnable(profile)) return undefined;
  return profile.wordResultMode === "dictionary" && isAIDictionaryCandidate(queryWordInfo)
    ? "dictionary"
    : "translation";
}
