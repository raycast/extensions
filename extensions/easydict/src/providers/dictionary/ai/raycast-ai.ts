/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { AI, environment } from "@raycast/api";

import { parseAIWordResult } from "@/ai-providers/dictionary/parser";
import { createAIDictionaryPromptSpec, renderAIDictionaryTextPrompt } from "@/ai-providers/dictionary/prompt";
import type { AIWordResult } from "@/ai-providers/dictionary/types";
import { getRaycastAIModel } from "@/ai-providers/runtime";
import type { RaycastAIProfile } from "@/ai-providers/types";
import { getLanguageEnglishName } from "@/core/language/utils";
import { DictionaryType } from "@/types/api";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { logTrace } from "@/utils/logger";

import { BaseDictionaryProvider } from "../base";
import { formatAIWordResult, resolveAIDictionaryWordInfo } from "./format";

export class RaycastAIDictionaryProvider extends BaseDictionaryProvider<AIWordResult> {
  type = DictionaryType.AI;

  constructor(private readonly profile: Readonly<RaycastAIProfile>) {
    super();
  }

  protected override get logLabel() {
    return this.profile.name;
  }

  protected async doQuery(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): Promise<DictionaryResult<AIWordResult>> {
    if (!environment.canAccess(AI)) {
      throw new RequestError(this.type, "Raycast AI is unavailable. Raycast Pro and AI access are required.");
    }
    const model = getRaycastAIModel(this.profile.model);
    if (!model) {
      throw new RequestError(this.type, `The configured Raycast AI model is unavailable: ${this.profile.model}`);
    }

    const fromLanguage = getLanguageEnglishName(queryWordInfo.fromLanguage);
    const toLanguage = getLanguageEnglishName(queryWordInfo.toLanguage);
    logTrace(this.logLabel, `dictionary (${model}): ${fromLanguage} -> ${toLanguage}: ${queryWordInfo.word}`);

    const prompt = renderAIDictionaryTextPrompt(createAIDictionaryPromptSpec(queryWordInfo, fromLanguage, toLanguage));
    const result = parseAIWordResult(await AI.ask(prompt, { model, creativity: "none", signal }));

    return {
      type: this.type,
      queryWordInfo: resolveAIDictionaryWordInfo(queryWordInfo, result),
      result,
      displaySections: formatAIWordResult(queryWordInfo, result),
    };
  }
}
