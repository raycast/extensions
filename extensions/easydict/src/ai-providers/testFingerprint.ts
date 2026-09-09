/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile } from "./types";

export function getAIProviderTestFingerprint(profile: AIProviderProfile): string {
  return JSON.stringify(
    profile.adapter === "raycast-ai"
      ? {
          adapter: profile.adapter,
          model: profile.model,
          wordResultMode: profile.wordResultMode,
        }
      : {
          adapter: profile.adapter,
          endpoint: profile.endpoint,
          model: profile.model,
          apiKey: profile.apiKey,
          tokenLimitMode: profile.tokenLimitMode,
          jsonOutputMode: profile.jsonOutputMode,
          wordResultMode: profile.wordResultMode,
        },
  );
}
