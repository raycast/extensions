import { describe, expect, it, vi } from "vitest";

import { myPreferences } from "@/consts";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { QueryInput } from "@/core/results/types";
import type { OpenAICompatibleProfile } from "@/providers/profiles/types";

import { builtinProviderCatalog, getBuiltinProviderPreferenceStatus } from "./catalog";
import { getCombinedAvailableProviderKeys, getCombinedProviderOrder } from "./order";
import { builtinDictionaryProviderServices, builtinTranslationServices, resolveProviderServices } from "./registry";

vi.mock("@raycast/api", () => ({
  AI: { Model: {} },
  Cache: class {
    get() {
      return undefined;
    }
    set() {}
    remove() {}
  },
  environment: { extensionName: "easydict", isDevelopment: false, canAccess: () => true },
  getPreferenceValues: () => ({
    servicesOrder: "",
    enableLingueeDictionary: true,
    enableYoudaoDictionary: true,
    enableDeepLTranslate: false,
    enableYoudaoTranslate: false,
    deepLAuthKey: "deepl-placeholder",
    enableOpenAITranslate: true,
    enableGeminiTranslate: true,
    openAIAPIKey: "openai-placeholder",
    openAIAPIURL: "https://api.openai.com/v1",
    openAIModel: "gpt-4.1-mini",
    geminiAPIKey: "gemini-placeholder",
    geminiAPIURL: "https://generativelanguage.googleapis.com",
    geminiModel: "gemini-2.5-flash",
  }),
}));

const defaultOrder = [
  "builtin:dictionary:Youdao Dictionary",
  "builtin:dictionary:Linguee Dictionary",
  "builtin:translation:DeepL Translate",
  "builtin:translation:DeepLX Translate",
  "builtin:translation:Google Translate",
  "builtin:translation:Bing Translate",
  "builtin:translation:Apple Translate",
  "builtin:translation:Baidu Translate",
  "builtin:translation:Tencent Translate",
  "builtin:translation:Volcano Translate",
  "builtin:translation:Youdao Translate",
  "builtin:translation:Caiyun Translate",
];
const wordQuery: QueryInput = { word: "word", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };

function createProfile(id: string, wordResultMode: OpenAICompatibleProfile["wordResultMode"]): OpenAICompatibleProfile {
  return {
    id,
    adapter: "openai-compatible",
    name: id,
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode,
    endpoint: "https://example.com/v1",
    model: "model",
    apiKey: "placeholder",
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
  };
}

describe("combined provider registry", () => {
  it("assembles every catalog provider with its factory and the default global order", () => {
    const services = [...builtinDictionaryProviderServices, ...builtinTranslationServices];
    expect(getCombinedProviderOrder([])).toEqual(defaultOrder);
    expect(getCombinedAvailableProviderKeys([]).sort()).toEqual([...defaultOrder].sort());
    expect(services.sort((left, right) => left.order - right.order).map((service) => service.providerKey)).toEqual(
      defaultOrder,
    );
    expect(services.map((service) => service.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (const service of services) {
      expect(service.id).toBe(`static:${service.type}`);
      expect(service.createProvider().type).toBe(service.type);
    }
  });

  it("shares a saved position between one profile's two services and keeps another profile independent", () => {
    const profiles = [createProfile("dictionary", "dictionary"), createProfile("translation", "translation")];
    const snapshot = resolveProviderServices({
      version: 2,
      profiles,
      migratedLegacyProviders: [],
      providerOrder: [
        "ai:translation",
        "builtin:dictionary:Youdao Dictionary",
        "ai:dictionary",
        "builtin:translation:Google Translate",
        "ai:translation",
        "deleted",
      ],
    });
    const services = [...snapshot.dictionaryServices, ...snapshot.translationServices];
    expect(
      services
        .filter((service) => service.id.startsWith("profile:"))
        .map(({ id, providerKey, order }) => ({ id, providerKey, order })),
    ).toEqual([
      { id: "profile:dictionary:dictionary", providerKey: "ai:dictionary", order: 2 },
      { id: "profile:dictionary", providerKey: "ai:dictionary", order: 2 },
      { id: "profile:translation", providerKey: "ai:translation", order: 0 },
    ]);
    expect(services.find((service) => service.type === TranslationType.Google)?.order).toBe(3);
    expect(services.find((service) => service.type === DictionaryType.Linguee)?.order).toBe(4);
    expect(
      services
        .filter((service) => service.id.startsWith("profile:") && service.enabled(wordQuery))
        .map((service) => service.id),
    ).toEqual(["profile:dictionary:dictionary", "profile:translation"]);
    expect(
      services
        .filter((service) => service.id.startsWith("profile:") && service.enabled({ ...wordQuery, isWord: false }))
        .map((service) => service.id),
    ).toEqual(["profile:dictionary", "profile:translation"]);
    expect(
      snapshot.dictionaryServices.find((service) => service.id === "profile:dictionary:dictionary")
        ?.canTriggerAutomaticAudio,
    ).toBe(false);
    expect(profiles.map((profile) => profile.order)).toEqual([0, 0]);
  });

  it("reports implicit preference enablement while applying its query restrictions at runtime", () => {
    const deepL = builtinProviderCatalog.find((provider) => provider.type === TranslationType.DeepL)!;
    const youdao = builtinProviderCatalog.find((provider) => provider.type === TranslationType.Youdao)!;
    expect(getBuiltinProviderPreferenceStatus(deepL, myPreferences)).toEqual({
      enabledInPreferences: false,
      implicitlyEnabledBy: "Linguee",
    });
    expect(getBuiltinProviderPreferenceStatus(youdao, myPreferences)).toEqual({
      enabledInPreferences: false,
      implicitlyEnabledBy: "Youdao Dictionary",
    });
    const deepLService = builtinTranslationServices.find((service) => service.type === TranslationType.DeepL)!;
    const youdaoService = builtinTranslationServices.find((service) => service.type === TranslationType.Youdao)!;
    for (const service of [deepLService, youdaoService]) {
      expect(service.enabled(wordQuery)).toBe(true);
      expect(service.enabled({ ...wordQuery, isWord: false })).toBe(false);
    }
    expect(deepLService.enabled({ ...wordQuery, toLanguage: "ko" })).toBe(false);
    expect(youdaoService.enabled({ ...wordQuery, fromLanguage: "de" })).toBe(false);
  });

  it("keeps disabled profiles registered without enabling either service", () => {
    const profile = { ...createProfile("disabled", "dictionary"), enabled: false };
    const snapshot = resolveProviderServices({ version: 2, profiles: [profile], migratedLegacyProviders: [] });
    const services = [...snapshot.translationServices, ...snapshot.dictionaryServices].filter((service) =>
      service.id.startsWith("profile:"),
    );
    expect(services).toHaveLength(2);
    expect(services.every((service) => !service.enabled(wordQuery))).toBe(true);
  });

  it("retains incomplete profile IDs while only ready configurations can execute", () => {
    const profile = { ...createProfile("incomplete", "dictionary"), endpoint: "" };
    const state = { version: 2 as const, profiles: [profile], migratedLegacyProviders: [] };
    const before = resolveProviderServices(state);
    const incompleteServices = [...before.translationServices, ...before.dictionaryServices].filter((service) =>
      service.id.startsWith("profile:"),
    );
    expect(incompleteServices.map((service) => service.id)).toEqual([
      "profile:incomplete",
      "profile:incomplete:dictionary",
    ]);
    for (const service of incompleteServices) {
      expect(service.enabled(wordQuery)).toBe(false);
      expect(service.createProvider).toThrow("Enter an API base URL.");
    }

    const after = resolveProviderServices({
      ...state,
      profiles: [{ ...profile, endpoint: "https://example.com/v1" }],
    });
    const readyServices = [...after.translationServices, ...after.dictionaryServices].filter((service) =>
      service.id.startsWith("profile:"),
    );
    expect(readyServices.map((service) => service.id)).toEqual(incompleteServices.map((service) => service.id));
    expect(readyServices.filter((service) => service.enabled(wordQuery)).map((service) => service.id)).toEqual([
      "profile:incomplete:dictionary",
    ]);
    expect(readyServices[1].createProvider()).toBeDefined();
    expect(state.profiles).toEqual([profile]);
    expect(profile.endpoint).toBe("");
  });

  it("removes deleted profiles without restoring legacy AI preference services", () => {
    const profile = createProfile("removed", "dictionary");
    const state = { version: 2 as const, profiles: [profile], migratedLegacyProviders: [] };
    const before = resolveProviderServices(state);
    expect(before.translationServices.map((service) => service.id)).toContain("profile:removed");
    expect(before.dictionaryServices.map((service) => service.id)).toContain("profile:removed:dictionary");
    const after = resolveProviderServices({ ...state, profiles: [], providerOrder: ["ai:removed", ...defaultOrder] });
    expect([...after.dictionaryServices, ...after.translationServices].map((service) => service.id).sort()).toEqual(
      defaultOrder.map((key) => `static:${key.split(":")[2]}`).sort(),
    );
    expect(after.translationServices.map((service) => service.type)).not.toContain(TranslationType.OpenAI);
    expect(after.translationServices.map((service) => service.type)).not.toContain(TranslationType.Gemini);
    expect(after.dictionaryServices.map((service) => service.type)).not.toContain(DictionaryType.AI);
  });
});
