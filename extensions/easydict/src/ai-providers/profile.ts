/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile, OpenAICompatibleProfile } from "./types";

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

export function getAIProviderProfileValidationError(profile: AIProviderProfile): string | undefined {
  if (!profile.name.trim()) return "Enter a provider name.";
  if (profile.adapter === "raycast-ai") {
    return profile.model.trim() ? undefined : "Choose a Raycast AI model.";
  }
  return getOpenAICompatibleProfileValidationError(profile);
}

export function getOpenAICompatibleProfileValidationError(profile: OpenAICompatibleProfile): string | undefined {
  if (!profile.model.trim()) return "Enter a model.";
  if (!profile.endpoint.trim()) return "Enter an API base URL.";

  try {
    const endpoint = new URL(profile.endpoint.trim());
    if ((endpoint.protocol !== "https:" && endpoint.protocol !== "http:") || !endpoint.hostname) {
      return "Enter a valid HTTP or HTTPS API base URL.";
    }
  } catch {
    return "Enter a valid HTTP or HTTPS API base URL.";
  }

  return undefined;
}
