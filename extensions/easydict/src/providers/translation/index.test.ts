import { describe, expect, it, vi } from "vitest";

import type { LegacyAIProviderConfiguration } from "@/ai-providers/legacy";
import { importLegacyAIProviders } from "@/ai-providers/legacy";
import { TranslationType } from "@/types/api";

import { resolveTranslationServices } from "./index";

const preferences = vi.hoisted(() => ({
  openAIAPIURL: "https://api.openai.com/v1",
  openAIModel: "gpt-4.1-mini",
  geminiAPIURL: "https://generativelanguage.googleapis.com",
  geminiModel: "gemini-2.5-flash",
  forceMaxCompletionTokens: false,
}));

vi.mock("@raycast/api", () => ({
  Cache: class {
    private readonly values = new Map<string, string>();

    get(key: string) {
      return this.values.get(key);
    }

    set(key: string, value: string) {
      this.values.set(key, value);
    }

    remove(key: string) {
      this.values.delete(key);
    }
  },
  AI: { Model: {} },
  environment: { extensionName: "easydict", isDevelopment: false, canAccess: () => true },
  getPreferenceValues: () => preferences,
}));

const legacy: LegacyAIProviderConfiguration = {
  openAI: {
    configured: true,
    enabled: true,
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    apiKey: "openai-placeholder",
    forceMaxCompletionTokens: false,
  },
  gemini: {
    configured: true,
    enabled: true,
    endpoint: "https://generativelanguage.googleapis.com",
    model: "gemini-2.5-flash",
    apiKey: "gemini-placeholder",
  },
};

describe("translation service compatibility", () => {
  it("restores legacy services after all imported profiles are deleted", () => {
    const imported = importLegacyAIProviders({ version: 1, profiles: [] }, legacy);

    const servicesWithImportedProfiles = resolveTranslationServices(imported.profiles);
    expect(servicesWithImportedProfiles.map((service) => service.id)).not.toContain(`static:${TranslationType.OpenAI}`);
    expect(servicesWithImportedProfiles.map((service) => service.id)).not.toContain(`static:${TranslationType.Gemini}`);

    const servicesAfterAllProfilesAreDeleted = resolveTranslationServices([]);
    expect(servicesAfterAllProfilesAreDeleted.map((service) => service.id)).toEqual(
      expect.arrayContaining([`static:${TranslationType.OpenAI}`, `static:${TranslationType.Gemini}`]),
    );
  });
});
