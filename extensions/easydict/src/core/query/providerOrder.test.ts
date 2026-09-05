import { describe, expect, it } from "vitest";

import { DictionaryType, TranslationType } from "@/types/api";

import {
  assignGlobalServiceOrder,
  getAIProviderKey,
  getBuiltinProviderKey,
  getInitialProviderOrder,
  getProviderOrder,
  reconcileAIProviderReplacementOrder,
  reconcileProviderOrder,
} from "./providerOrder";

describe("provider ordering", () => {
  it("uses one explicit order across dictionary and translation provider types", () => {
    const dictionaryKey = getBuiltinProviderKey("dictionary", DictionaryType.Youdao);
    const translationKey = getBuiltinProviderKey("translation", TranslationType.DeepL);
    const services = [
      { providerKey: translationKey, order: 0 },
      { providerKey: dictionaryKey, order: 0 },
    ];

    const ordered = assignGlobalServiceOrder(services, [translationKey, dictionaryKey]);

    expect(ordered.map((service) => service.order)).toEqual([0, 1]);
  });

  it("keeps dictionary and translation modes of one AI provider together", () => {
    const profile = {
      id: "shared-provider",
      adapter: "openai-compatible" as const,
      name: "Shared",
      enabled: true,
      order: 0,
      icon: { kind: "initials" as const },
      wordResultMode: "dictionary" as const,
      endpoint: "https://example.com/v1",
      model: "model",
      apiKey: "",
      tokenLimitMode: "max-tokens" as const,
      jsonOutputMode: "prompt" as const,
    };

    expect(getAIProviderKey(profile)).toBe(getAIProviderKey({ ...profile, wordResultMode: "translation" }));
  });

  it("derives missing saved order from legacy servicesOrder semantics", () => {
    const dictionaryKey = getBuiltinProviderKey("dictionary", DictionaryType.Youdao);
    const translationKey = getBuiltinProviderKey("translation", TranslationType.DeepL);
    const googleKey = getBuiltinProviderKey("translation", TranslationType.Google);
    const openAIKey = getBuiltinProviderKey("translation", TranslationType.OpenAI);
    const geminiKey = getBuiltinProviderKey("translation", TranslationType.Gemini);
    const aiKey = getAIProviderKey({
      id: "dictionary-provider",
      adapter: "openai-compatible",
      name: "Dictionary Provider",
      enabled: true,
      order: 0,
      icon: { kind: "initials" },
      wordResultMode: "dictionary",
      endpoint: "https://example.com/v1",
      model: "model",
      apiKey: "",
      tokenLimitMode: "max-tokens",
      jsonOutputMode: "prompt",
    });

    const order = getInitialProviderOrder(
      [
        { providerKey: dictionaryKey, type: DictionaryType.Youdao, serviceOrder: 0 },
        { providerKey: translationKey, type: TranslationType.DeepL, serviceOrder: 7 },
        { providerKey: googleKey, type: TranslationType.Google, serviceOrder: 6 },
        { providerKey: openAIKey, type: TranslationType.OpenAI, serviceOrder: 11 },
        { providerKey: geminiKey, type: TranslationType.Gemini, serviceOrder: 5 },
        { providerKey: aiKey, type: DictionaryType.AI, serviceOrder: 0, profileOrder: 0 },
      ],
      ["google", "youdao dictionary"],
    );

    expect(order.indexOf(googleKey)).toBeLessThan(order.indexOf(dictionaryKey));
    expect(order.indexOf(dictionaryKey)).toBeLessThan(order.indexOf(aiKey));
    expect(order.indexOf(aiKey)).toBeLessThan(order.indexOf(openAIKey));
    expect(order.indexOf(openAIKey)).toBeLessThan(order.indexOf(geminiKey));
    expect(order.indexOf(geminiKey)).toBeLessThan(order.indexOf(translationKey));
  });

  it("reconciles stale and duplicate saved keys while appending new providers", () => {
    const existing = "existing";
    const newProvider = "new";
    expect(
      reconcileProviderOrder([existing, "stale", existing], [existing, newProvider], [existing, newProvider]),
    ).toEqual([existing, newProvider]);
  });

  it("uses explicit legacy assignments as stable built-in keys", () => {
    const openAIKey = getBuiltinProviderKey("translation", TranslationType.OpenAI);
    const geminiKey = getBuiltinProviderKey("translation", TranslationType.Gemini);
    const profile = {
      id: "profile",
      adapter: "openai-compatible" as const,
      name: "Provider",
      enabled: true,
      order: 0,
      icon: { kind: "preset" as const, name: "openai" as const },
      wordResultMode: "translation" as const,
      endpoint: "https://api.openai.com/v1",
      model: "model",
      apiKey: "key",
      tokenLimitMode: "max-tokens" as const,
      jsonOutputMode: "prompt" as const,
    };

    expect(getAIProviderKey(profile, { openai: { kind: "profile", profileId: profile.id } })).toBe(openAIKey);
    expect(getAIProviderKey(profile, { gemini: { kind: "profile", profileId: profile.id } })).toBe(geminiKey);
  });

  it("keeps an imported legacy provider in the same position as its built-in row", () => {
    const openAIKey = getBuiltinProviderKey("translation", TranslationType.OpenAI);
    const builtinCandidates = [
      {
        providerKey: getBuiltinProviderKey("dictionary", DictionaryType.Youdao),
        type: DictionaryType.Youdao,
        serviceOrder: 0,
      },
      { providerKey: openAIKey, type: TranslationType.OpenAI, serviceOrder: 11 },
    ];
    const beforeImport = getProviderOrder([], undefined, [], builtinCandidates);
    const afterImport = getProviderOrder(
      [
        {
          id: "profile-openai",
          adapter: "openai-compatible",
          name: "OpenAI",
          enabled: true,
          order: 0,
          icon: { kind: "preset", name: "openai" },
          wordResultMode: "translation",
          endpoint: "https://api.openai.com/v1",
          model: "model",
          apiKey: "key",
          tokenLimitMode: "max-tokens",
          jsonOutputMode: "prompt",
        },
      ],
      undefined,
      [],
      builtinCandidates,
      { openai: { kind: "profile", profileId: "profile-openai" } },
    );

    expect(afterImport.indexOf(openAIKey)).toBe(beforeImport.indexOf(openAIKey));
  });

  it("places a profile immediately after the legacy slot when replacement stops", () => {
    const profile = {
      id: "profile-gemini",
      adapter: "raycast-ai" as const,
      name: "Raycast AI",
      enabled: true,
      order: 0,
      icon: { kind: "preset" as const, name: "raycast" as const },
      wordResultMode: "translation" as const,
      model: "model",
    };
    const googleKey = getBuiltinProviderKey("translation", TranslationType.Google);
    const geminiKey = getBuiltinProviderKey("translation", TranslationType.Gemini);
    const deepLKey = getBuiltinProviderKey("translation", TranslationType.DeepL);

    expect(reconcileAIProviderReplacementOrder([googleKey, geminiKey, deepLKey], profile, "gemini", undefined)).toEqual(
      [googleKey, geminiKey, getAIProviderKey(profile), deepLKey],
    );
    expect(
      reconcileAIProviderReplacementOrder(
        [googleKey, geminiKey, getAIProviderKey(profile), deepLKey],
        profile,
        undefined,
        "gemini",
      ),
    ).toEqual([googleKey, geminiKey, deepLKey]);
  });
});
