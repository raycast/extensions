/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { streamText } from "@xsai/stream-text";

import { parseAIWordResult } from "@/ai-providers/dictionary/parser";
import { createAIDictionaryPromptSpec, renderAIDictionaryChatMessages } from "@/ai-providers/dictionary/prompt";
import type { AIWordResult } from "@/ai-providers/dictionary/types";
import { normalizeOpenAICompatibleEndpoint } from "@/ai-providers/endpoint";
import { getTokenLimitParams } from "@/ai-providers/tokenLimit";
import type { JSONOutputMode, OpenAICompatibleProfile } from "@/ai-providers/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { DictionaryType } from "@/types/api";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/types/query";
import { normalizeError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logTrace, logWarn } from "@/utils/logger";

import { BaseDictionaryProvider } from "../base";
import { formatAIWordResult, resolveAIDictionaryWordInfo } from "./format";

const MAX_DICTIONARY_TOKENS = 3000;

export type NativeJSONUnsupportedHandler = (fallbackProfile: OpenAICompatibleProfile) => void | Promise<void>;

export class OpenAICompatibleDictionaryProvider extends BaseDictionaryProvider<AIWordResult> {
  type = DictionaryType.AI;

  constructor(
    private readonly profile: Readonly<OpenAICompatibleProfile>,
    private readonly onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
  ) {
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
    let result: AIWordResult;
    if (this.profile.jsonOutputMode !== "json-object") {
      result = parseAIWordResult(await this.requestCompletion(messages, "prompt", signal));
    } else {
      let completion: string;
      try {
        completion = await this.requestCompletion(messages, "json-object", signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        if (!isUnsupportedJSONOutputError(error)) throw error;
        await this.notifyNativeJSONUnsupported();
        logWarn(this.logLabel, "native JSON output is unsupported; falling back to prompt-based JSON");
        result = parseAIWordResult(await this.requestCompletion(messages, "prompt", signal));
        return this.createResult(queryWordInfo, result);
      }

      try {
        result = parseAIWordResult(completion);
      } catch {
        logWarn(this.logLabel, "native JSON output was invalid; retrying with prompt-based JSON");
        result = parseAIWordResult(await this.requestCompletion(messages, "prompt", signal));
      }
    }

    return this.createResult(queryWordInfo, result);
  }

  private async requestCompletion(
    messages: ReturnType<typeof renderAIDictionaryChatMessages>,
    outputMode: JSONOutputMode,
    signal?: AbortSignal,
  ): Promise<string> {
    const apiKey = this.profile.apiKey.trim();
    const streamResult = streamText({
      baseURL: normalizeOpenAICompatibleEndpoint(this.profile.endpoint),
      ...(apiKey ? { apiKey } : {}),
      model: this.profile.model.trim(),
      messages,
      abortSignal: signal,
      fetch: timedFetch.native,
      ...getTokenLimitParams(this.profile.tokenLimitMode, MAX_DICTIONARY_TOKENS),
      ...(outputMode === "json-object" ? { responseFormat: { type: "json_object" as const } } : {}),
    });

    Object.values(streamResult).forEach((value) => {
      if (value instanceof Promise) value.catch(() => {});
    });

    const chunks: string[] = [];
    for await (const chunk of streamResult.textStream) {
      if (chunk) chunks.push(chunk);
    }

    return chunks.join("");
  }

  private createResult(queryWordInfo: QueryInput, result: AIWordResult): DictionaryResult<AIWordResult> {
    return {
      type: this.type,
      queryWordInfo: resolveAIDictionaryWordInfo(queryWordInfo, result),
      result,
      displaySections: formatAIWordResult(queryWordInfo, result),
    };
  }

  private async notifyNativeJSONUnsupported(): Promise<void> {
    try {
      await this.onNativeJSONUnsupported?.({ ...this.profile, jsonOutputMode: "prompt" });
    } catch (error) {
      logWarn(this.logLabel, `unable to save prompt-based JSON fallback: ${normalizeError(error).message}`);
    }
  }
}

function isUnsupportedJSONOutputError(error: unknown): boolean {
  const { message, code } = normalizeError(error);
  const description = `${message} ${code}`;
  const mentionsJSONOutput = /response[_\s-]?format|json[_\s-]?object/i.test(description);
  const rejectsJSONOutput =
    /not supported|does(?: not|n't) support|unsupported|not available|unavailable|unknown (?:field|parameter)|unrecognized (?:field|parameter)|unexpected (?:field|parameter)|not allowed|not permitted|invalid (?:parameter|value)|extra inputs?|must be omitted|should not be (?:set|specified|provided)/i.test(
      description,
    );
  return mentionsJSONOutput && rejectsJSONOutput;
}
