/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { normalizeOpenAICompatibleEndpoint } from "@/ai-providers/endpoint";
import { getTokenLimitParams } from "@/ai-providers/tokenLimit";
import type { OpenAICompatibleProfile } from "@/ai-providers/types";
import { TranslationType } from "@/types/api";

import { BaseOpenAICompatibleTranslateProvider } from "../openai-compatible/base";

const DEFAULT_MAX_TOKENS = 2000;
export class ConfiguredOpenAICompatibleTranslateProvider extends BaseOpenAICompatibleTranslateProvider {
  type = TranslationType.OpenAI;

  constructor(private readonly profile: Readonly<OpenAICompatibleProfile>) {
    super();
  }

  protected override get logLabel() {
    return this.profile.name;
  }

  protected getEndpoint() {
    return normalizeOpenAICompatibleEndpoint(this.profile.endpoint);
  }

  protected getModel() {
    return this.profile.model.trim();
  }

  protected getAPIKey() {
    return this.profile.apiKey.trim();
  }

  protected getTokenLimitParams() {
    return getTokenLimitParams(this.profile.tokenLimitMode, DEFAULT_MAX_TOKENS);
  }
}
