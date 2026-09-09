import { describe, expect, it, vi } from "vitest";

import { createProfileFromLegacySettings } from "@/ai-providers/legacy";
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

describe("translation service compatibility", () => {
  it("never exposes legacy AI services through the built-in fallback registry", () => {
    expect(translationServices.map((service) => service.type)).not.toContain(TranslationType.OpenAI);
    expect(translationServices.map((service) => service.type)).not.toContain(TranslationType.Gemini);
  });

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

  it("removes a deleted AI profile without restoring any preference-backed AI service", () => {
    const profile = createProfileFromLegacySettings(
      "openai",
      {
        openai: {
          enabled: true,
          apiKey: "placeholder",
          endpoint: "https://api.openai.com/v1",
          model: "model",
          forceMaxCompletionTokens: false,
        },
        gemini: { enabled: false, apiKey: "", endpoint: "https://example.com", model: "model" },
      },
      0,
    );
    expect(resolveTranslationServices([profile]).map((service) => service.id)).toContain(`profile:${profile.id}`);
    expect(resolveTranslationServices([]).map((service) => service.id)).toEqual(
      translationServices.map((service) => service.id),
    );
    expect(resolveTranslationServices([]).map((service) => service.type)).not.toContain(TranslationType.OpenAI);
    expect(resolveTranslationServices([]).map((service) => service.type)).not.toContain(TranslationType.Gemini);
  });
});
