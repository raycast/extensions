import { describe, expect, it } from "vitest";

import { DictionaryType, TranslationType } from "@/core/results/kinds";

import { getBuiltinProviderKey } from "./catalog";
import { getAIProviderKey, getInitialProviderOrder, moveProviderInOrder, reconcileProviderOrder } from "./order";

describe("provider ordering", () => {
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

  it("applies consecutive provider moves to the latest order", () => {
    const firstMove = moveProviderInOrder(["a", "b", "c", "d"], "b", 1);
    const secondMove = moveProviderInOrder(firstMove, "b", 1);

    expect(secondMove).toEqual(["a", "c", "d", "b"]);
  });
});
