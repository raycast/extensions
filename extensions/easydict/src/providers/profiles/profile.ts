/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile } from "./types";

export function normalizeAIProviderProfile(profile: AIProviderProfile): AIProviderProfile {
  if (profile.adapter === "raycast-ai") {
    return {
      ...profile,
      name: profile.name.trim(),
      model: profile.model.trim(),
    };
  }

  return {
    ...profile,
    name: profile.name.trim(),
    endpoint: profile.endpoint.trim(),
    website: profile.website?.trim() || undefined,
    model: profile.model.trim(),
    apiKey: profile.apiKey.trim(),
  };
}
