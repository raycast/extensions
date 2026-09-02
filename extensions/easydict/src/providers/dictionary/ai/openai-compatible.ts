/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { streamText } from "@xsai/stream-text";

import { parseAIWordResult } from "@/ai-providers/dictionary/parser";
import { createAIDictionaryPromptSpec, renderAIDictionaryChatMessages } from "@/ai-providers/dictionary/prompt";
import type { AIWordResult } from "@/ai-providers/dictionary/types";
import { normalizeOpenAICompatibleEndpoint } from "@/ai-providers/endpoint";
import { getTokenLimitParams } from "@/ai-providers/tokenLimit";
import type { OpenAICompatibleProfile } from "@/ai-providers/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { DictionaryType } from "@/types/api";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/types/query";
import { timedFetch } from "@/utils/http";
import { logTrace } from "@/utils/logger";

import { BaseDictionaryProvider } from "../base";
import { formatAIWordResult, resolveAIDictionaryWordInfo } from "./format";

const MAX_DICTIONARY_TOKENS = 3000;

export class OpenAICompatibleDictionaryProvider extends BaseDictionaryProvider<AIWordResult> {
  type = DictionaryType.AI;

  constructor(private readonly profile: Readonly<OpenAICompatibleProfile>) {
    super();
  }

  protected override get logLabel() {
    return this.profile.name;
  }

  protected async doQuery(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): Promise<DictionaryResult<AIWordResult>> {
    const fromLanguage = getLanguageEnglishName(queryWordInfo.fromLanguage);
    const toLanguage = getLanguageEnglishName(queryWordInfo.toLanguage);
    const model = this.profile.model.trim();
    logTrace(this.logLabel, `dictionary (${model}): ${fromLanguage} -> ${toLanguage}: ${queryWordInfo.word}`);

    const messages = renderAIDictionaryChatMessages(
      createAIDictionaryPromptSpec(queryWordInfo, fromLanguage, toLanguage),
    );
    const apiKey = this.profile.apiKey.trim();
    const streamResult = streamText({
      baseURL: normalizeOpenAICompatibleEndpoint(this.profile.endpoint),
      ...(apiKey ? { apiKey } : {}),
      model,
      messages,
      abortSignal: signal,
      fetch: timedFetch.native,
      ...getTokenLimitParams(this.profile.tokenLimitMode, MAX_DICTIONARY_TOKENS),
      ...(this.profile.jsonOutputMode === "json-object" ? { responseFormat: { type: "json_object" as const } } : {}),
    });

    Object.values(streamResult).forEach((value) => {
      if (value instanceof Promise) value.catch(() => {});
    });

    const chunks: string[] = [];
    for await (const chunk of streamResult.textStream) {
      if (chunk) chunks.push(chunk);
    }

    const result = parseAIWordResult(chunks.join(""));
    return {
      type: this.type,
      queryWordInfo: resolveAIDictionaryWordInfo(queryWordInfo, result),
      result,
      displaySections: formatAIWordResult(queryWordInfo, result),
    };
  }
}
