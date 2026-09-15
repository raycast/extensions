/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { AI, environment } from "@raycast/api";

import { getRaycastAIModel } from "@/ai-providers/runtime";
import type { RaycastAIProfile } from "@/ai-providers/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { BaseStreamingTranslateProvider } from "@/providers/translation/base";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions, StreamChunk, TranslationResult } from "@/types/query";
import { CancelledError, RequestError } from "@/utils/errors";
import { logTrace } from "@/utils/logger";

import { createTranslationPromptSpec, renderTranslationTextPrompt } from "./prompt";

export class RaycastAITranslateProvider extends BaseStreamingTranslateProvider<{ translatedText: string }> {
  type = TranslationType.OpenAI;

  constructor(private readonly profile: Readonly<RaycastAIProfile>) {
    super();
  }

  protected override get logLabel() {
    return this.profile.name;
  }

  protected async *doTranslate(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): AsyncGenerator<StreamChunk, TranslationResult<{ translatedText: string }>, unknown> {
    if (!environment.canAccess(AI)) {
      throw new RequestError(this.type, "Raycast AI is unavailable. Raycast Pro and AI access are required.");
    }
    const model = getRaycastAIModel(this.profile.model);
    if (!model) {
      throw new RequestError(this.type, `The configured Raycast AI model is unavailable: ${this.profile.model}`);
    }

    const fromLanguage = getLanguageEnglishName(queryWordInfo.fromLanguage);
    const toLanguage = getLanguageEnglishName(queryWordInfo.toLanguage);
    logTrace(this.logLabel, `translate (${model}): ${fromLanguage} -> ${toLanguage}: ${queryWordInfo.word}`);

    const spec = createTranslationPromptSpec(queryWordInfo, fromLanguage, toLanguage);
    const answer = AI.ask(renderTranslationTextPrompt(spec), {
      model,
      creativity: "none",
      signal,
    });
    const translatedText = yield* streamRaycastAIAnswer(answer, signal);

    return {
      type: this.type,
      queryWordInfo,
      translations: [translatedText],
      result: { translatedText },
    };
  }
}

async function* streamRaycastAIAnswer(
  answer: ReturnType<typeof AI.ask>,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk, string, unknown> {
  const chunks: string[] = [];
  let finalText: string | undefined;
  let failure: unknown;
  let settled = false;
  let wake: (() => void) | undefined;

  const notify = () => {
    wake?.();
    wake = undefined;
  };
  const settle = (result: { text: string } | { error: unknown }) => {
    if (settled) return;
    settled = true;
    if ("text" in result) {
      finalText = result.text;
    } else {
      failure = result.error;
    }
    notify();
  };
  const handleAbort = () => settle({ error: new CancelledError() });

  if (signal?.aborted) {
    handleAbort();
  } else {
    signal?.addEventListener("abort", handleAbort, { once: true });
  }

  answer.on("data", (chunk) => {
    if (settled || !chunk) return;
    chunks.push(chunk);
    notify();
  });
  answer.then(
    (text) => settle({ text }),
    (error: unknown) => settle({ error }),
  );

  let emittedChunks = 0;
  try {
    while (true) {
      while (emittedChunks < chunks.length) {
        yield { content: chunks[emittedChunks], role: "assistant" };
        emittedChunks += 1;
      }
      if (failure !== undefined) throw failure;
      if (settled) return finalText || chunks.join("");
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
  } finally {
    signal?.removeEventListener("abort", handleAbort);
  }
}
