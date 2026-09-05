import { describe, expect, it, vi } from "vitest";

import type { LegacyAIProviderConfiguration } from "@/ai-providers/legacy";
import { importLegacyAIProviders } from "@/ai-providers/legacy";
import { TranslationType } from "@/types/api";

import { resolveTranslationServices, translationServices } from "./index";

const preferences = vi.hoisted(() => ({
  enableOpenAITranslate: true,
  enableGeminiTranslate: true,
  enableDeepLTranslate: false,
  enableLingueeDictionary: true,
  deepLAuthKey: "deepl-placeholder",
  enableYoudaoTranslate: false,
  enableYoudaoDictionary: true,
  openAIAPIKey: "openai-placeholder",
  openAIAPIURL: "https://api.openai.com/v1",
  openAIModel: "gpt-4.1-mini",
  geminiAPIKey: "gemini-placeholder",
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
  openai: {
    enabled: true,
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    apiKey: "openai-placeholder",
    forceMaxCompletionTokens: false,
  },
  gemini: {
    enabled: true,
    endpoint: "https://generativelanguage.googleapis.com",
    model: "gemini-2.5-flash",
    apiKey: "gemini-placeholder",
  },
};

describe("translation service compatibility", () => {
  it("marks providers enabled indirectly through dictionary settings", () => {
    expect(translationServices.find((service) => service.type === TranslationType.DeepL)).toMatchObject({
      enabledInPreferences: false,
      implicitlyEnabledBy: "Linguee",
    });
    expect(translationServices.find((service) => service.type === TranslationType.Youdao)).toMatchObject({
      enabledInPreferences: false,
      implicitlyEnabledBy: "Youdao Dictionary",
    });
  });

  it("keeps legacy services retired after their replacement profiles are deleted", () => {
    const imported = importLegacyAIProviders({ version: 1, profiles: [] }, legacy);

    const servicesWithImportedProfiles = resolveTranslationServices(
      imported.profiles,
      undefined,
      imported.legacyProviderAssignments,
    );
    expect(servicesWithImportedProfiles.map((service) => service.id)).not.toContain(`static:${TranslationType.OpenAI}`);
    expect(servicesWithImportedProfiles.map((service) => service.id)).not.toContain(`static:${TranslationType.Gemini}`);

    const servicesAfterAllProfilesAreDeleted = resolveTranslationServices(
      [],
      undefined,
      imported.legacyProviderAssignments,
    );
    expect(servicesAfterAllProfilesAreDeleted.map((service) => service.id)).not.toContain(
      `static:${TranslationType.OpenAI}`,
    );
    expect(servicesAfterAllProfilesAreDeleted.map((service) => service.id)).not.toContain(
      `static:${TranslationType.Gemini}`,
    );

    const servicesAfterRestore = resolveTranslationServices([]);
    expect(servicesAfterRestore.map((service) => service.id)).toEqual(
      expect.arrayContaining([`static:${TranslationType.OpenAI}`, `static:${TranslationType.Gemini}`]),
    );
  });
});
