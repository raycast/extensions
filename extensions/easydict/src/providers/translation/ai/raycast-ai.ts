/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { AI, environment } from "@raycast/api";

import type { TranslationContent } from "@/core/content/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions, StreamChunk } from "@/core/results/types";
import type { RaycastAIRuntimeConfig } from "@/providers/profiles/runtime";
import { BaseStreamingTranslateProvider } from "@/providers/translation/base";
import { CancelledError, RequestError } from "@/shared/errors";
import { logTrace } from "@/shared/logger";

import { createTranslationPromptSpec, renderTranslationTextPrompt } from "./prompt";

export class RaycastAITranslateProvider extends BaseStreamingTranslateProvider {
  type = TranslationType.OpenAI;

  constructor(private readonly config: RaycastAIRuntimeConfig) {
    super();
  }

  protected override get logLabel() {
    return this.config.name;
  }

  protected async *doTranslate(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): AsyncGenerator<StreamChunk, TranslationContent, unknown> {
    if (!environment.canAccess(AI)) {
      throw new RequestError(this.type, "Raycast AI is unavailable. Raycast Pro and AI access are required.");
    }
    const model = this.config.model;

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
      kind: "translation",
      query: queryWordInfo,
      paragraphs: [translatedText],
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
        yield { content: chunks[emittedChunks] };
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
