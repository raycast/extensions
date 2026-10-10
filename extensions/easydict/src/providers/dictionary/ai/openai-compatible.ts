/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { streamText } from "@xsai/stream-text";

import type { DictionaryContent } from "@/core/content/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import type { OpenAICompatibleRuntimeConfig } from "@/providers/profiles/runtime";
import { getTokenLimitParams } from "@/providers/profiles/tokenLimit";
import type { JSONOutputMode } from "@/providers/profiles/types";
import { getOpenAICompatibleRequestHeaders } from "@/providers/shared/openai-compatible-headers";
import { normalizeError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logTrace, logWarn } from "@/shared/logger";

import { BaseDictionaryProvider } from "../base";
import { buildAIWordContent } from "./content";
import { parseAIWordResult } from "./parser";
import { createAIDictionaryPromptSpec, renderAIDictionaryChatMessages } from "./prompt";
import type { AIWordResult } from "./types";

const MAX_DICTIONARY_TOKENS = 3000;

export type NativeJSONUnsupportedHandler = (
  provider: Pick<OpenAICompatibleRuntimeConfig, "id" | "name">,
  signal?: AbortSignal,
) => void | Promise<void>;

export class OpenAICompatibleDictionaryProvider extends BaseDictionaryProvider {
  type = DictionaryType.AI;

  constructor(
    private readonly config: OpenAICompatibleRuntimeConfig,
    private readonly onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
  ) {
    super();
  }

  protected override get logLabel() {
    return this.config.name;
  }

  protected async doQuery(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<DictionaryContent> {
    const fromLanguage = getLanguageEnglishName(queryWordInfo.fromLanguage);
    const toLanguage = getLanguageEnglishName(queryWordInfo.toLanguage);
    const headers = getOpenAICompatibleRequestHeaders(this.config.endpoint);
    logTrace(
      this.logLabel,
      `dictionary (${this.config.request.model}): ${fromLanguage} -> ${toLanguage}: ${queryWordInfo.word}`,
    );

    const messages = renderAIDictionaryChatMessages(
      createAIDictionaryPromptSpec(queryWordInfo, fromLanguage, toLanguage),
    );
    let result: AIWordResult;
    if (this.config.jsonOutputMode !== "json-object") {
      result = parseAIWordResult(await this.requestCompletion(messages, "prompt", headers, signal));
    } else {
      let completion: string;
      try {
        completion = await this.requestCompletion(messages, "json-object", headers, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        if (!isUnsupportedJSONOutputError(error)) throw error;
        await this.notifyNativeJSONUnsupported(signal);
        logWarn(this.logLabel, "native JSON output is unsupported; falling back to prompt-based JSON");
        result = parseAIWordResult(await this.requestCompletion(messages, "prompt", headers, signal));
        return buildAIWordContent(queryWordInfo, result);
      }

      try {
        result = parseAIWordResult(completion);
      } catch {
        logWarn(this.logLabel, "native JSON output was invalid; retrying with prompt-based JSON");
        result = parseAIWordResult(await this.requestCompletion(messages, "prompt", headers, signal));
      }
    }

    return buildAIWordContent(queryWordInfo, result);
  }

  private async requestCompletion(
    messages: ReturnType<typeof renderAIDictionaryChatMessages>,
    outputMode: JSONOutputMode,
    headers: Record<string, string> | undefined,
    signal?: AbortSignal,
  ): Promise<string> {
    signal?.throwIfAborted();
    const streamResult = streamText({
      ...this.config.request,
      ...(headers ? { headers } : {}),
      messages,
      abortSignal: signal,
      fetch: timedFetch.native,
      ...getTokenLimitParams(this.config.tokenLimitMode, MAX_DICTIONARY_TOKENS),
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

  private async notifyNativeJSONUnsupported(signal?: AbortSignal): Promise<void> {
    try {
      await this.onNativeJSONUnsupported?.({ id: this.config.id, name: this.config.name }, signal);
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
