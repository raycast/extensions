import type { DictionaryContent, TranslationContent } from "@/core/content/types";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import type { TranslationServiceConfig } from "@/providers/translation";
import { BaseNonStreamingTranslateProvider } from "@/providers/translation/base";

import { createDeferred } from "./deferred";

interface PendingRequest<Content> {
  query: QueryInput;
  signal?: AbortSignal;
  resolve: (content: Content) => void;
}

export function createQueryProviders() {
  const dictionaryRequests: PendingRequest<DictionaryContent>[] = [];
  const translationRequests: PendingRequest<TranslationContent>[] = [];

  class DictionaryProvider extends BaseDictionaryProvider {
    constructor(public type: DictionaryType) {
      super();
    }

    protected doQuery(query: QueryInput, options?: RequestOptions): Promise<DictionaryContent> {
      const { promise, resolve } = createDeferred<DictionaryContent>();
      dictionaryRequests.push({ query, signal: options?.signal, resolve });
      return promise;
    }
  }

  class TranslationProvider extends BaseNonStreamingTranslateProvider {
    constructor(public type: TranslationType) {
      super();
    }

    protected doTranslate(query: QueryInput, options?: RequestOptions): Promise<TranslationContent> {
      const { promise, resolve } = createDeferred<TranslationContent>();
      translationRequests.push({ query, signal: options?.signal, resolve });
      return promise;
    }
  }

  function dictionaryService(overrides: Partial<DictionaryServiceConfig> = {}): DictionaryServiceConfig {
    const type = overrides.type ?? DictionaryType.Linguee;
    return {
      id: `static:${type}`,
      label: type,
      providerKey: `builtin:dictionary:${type}`,
      order: 0,
      type,
      enabled: () => true,
      createProvider: () => new DictionaryProvider(type),
      canTriggerAutomaticAudio: true,
      ...overrides,
    };
  }

  function translationService(overrides: Partial<TranslationServiceConfig> = {}): TranslationServiceConfig {
    const type = overrides.type ?? TranslationType.OpenAI;
    return {
      id: "profile:test",
      label: "Test AI",
      providerKey: "ai:test",
      order: 0,
      type,
      enabled: () => true,
      createProvider: () => new TranslationProvider(type),
      ...overrides,
    };
  }

  return { dictionaryService, translationService, dictionaryRequests, translationRequests };
}

export function createQueryInput(word: string): QueryInput {
  return { word, fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
}

export function createDictionaryContent(query: QueryInput): DictionaryContent {
  return { kind: "dictionary", query, sections: [{ kind: "translation", text: query.word }] };
}
