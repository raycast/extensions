/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { streamText } from "@xsai/stream-text";

import type { TranslationContent } from "@/core/content/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions, StreamChunk } from "@/core/results/types";
import type { OpenAICompatibleRuntimeConfig } from "@/providers/profiles/runtime";
import { getTokenLimitParams } from "@/providers/profiles/tokenLimit";
import { getOpenAICompatibleRequestHeaders } from "@/providers/shared/openai-compatible-headers";
import { BaseStreamingTranslateProvider } from "@/providers/translation/base";
import { timedFetch } from "@/shared/http";
import { logTrace } from "@/shared/logger";

import { createTranslationPromptSpec, renderTranslationChatMessages } from "./prompt";

const DEFAULT_MAX_TOKENS = 2000;

export class ConfiguredOpenAICompatibleTranslateProvider extends BaseStreamingTranslateProvider {
  type = TranslationType.OpenAI;

  constructor(private readonly config: OpenAICompatibleRuntimeConfig) {
    super();
  }

  protected override get logLabel() {
    return this.config.name;
  }

  protected async *doTranslate(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): AsyncGenerator<StreamChunk, TranslationContent, unknown> {
    const headers = getOpenAICompatibleRequestHeaders(this.config.endpoint);

    const fromLanguage = getLanguageEnglishName(queryWordInfo.fromLanguage);
    const toLanguage = getLanguageEnglishName(queryWordInfo.toLanguage);

    logTrace(
      this.logLabel,
      `translate (${this.config.request.model}): ${fromLanguage} -> ${toLanguage}: ${queryWordInfo.word}`,
    );

    const tokenParams = getTokenLimitParams(this.config.tokenLimitMode, DEFAULT_MAX_TOKENS);
    const messages = renderTranslationChatMessages(
      createTranslationPromptSpec(queryWordInfo, fromLanguage, toLanguage),
    );

    const chunks: string[] = [];

    const streamResult = streamText({
      ...this.config.request,
      ...(headers ? { headers } : {}),
      messages,
      abortSignal: signal,
      fetch: timedFetch.native,
      ...tokenParams,
    });

    // Suppress unhandled rejection warnings for unused promises (e.g. usage, messages)
    Object.values(streamResult).forEach((value) => {
      if (value instanceof Promise) value.catch(() => {});
    });

    const { textStream } = streamResult;

    for await (const chunk of textStream) {
      if (chunk) {
        chunks.push(chunk);
        yield { content: chunk };
      }
    }

    const resultText = chunks.join("");

    return {
      kind: "translation",
      query: queryWordInfo,
      paragraphs: [resultText],
    };
  }
}
