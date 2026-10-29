/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile } from "./types";

export function getAIProviderCacheIdentity(profile: AIProviderProfile, promptVersion: number): string {
  return profile.adapter === "raycast-ai"
    ? JSON.stringify({
        adapter: profile.adapter,
        model: profile.model,
        wordResultMode: profile.wordResultMode,
        promptVersion,
      })
    : JSON.stringify({
        adapter: profile.adapter,
        endpoint: profile.endpoint,
        model: profile.model,
        credential: profile.apiKey,
        tokenLimitMode: profile.tokenLimitMode,
        jsonOutputMode: profile.jsonOutputMode,
        wordResultMode: profile.wordResultMode,
        promptVersion,
      });
}
