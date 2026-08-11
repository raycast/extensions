/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { ProviderConfig } from "@/providers/shared/config";
import { TranslationType } from "@/types/api";

import { BaseOpenAICompatibleTranslateProvider } from "./base";

const OPENAI_COMPAT_SUFFIX = "/v1beta/openai";

export class GeminiTranslateProvider extends BaseOpenAICompatibleTranslateProvider {
  type = TranslationType.Gemini;

  protected getEndpoint() {
    const endpoint = ProviderConfig.geminiEndpoint;
    return `${endpoint}${OPENAI_COMPAT_SUFFIX}`;
  }

  protected getModel() {
    return ProviderConfig.geminiModel;
  }

  protected getAPIKey() {
    return ProviderConfig.geminiAPIKey;
  }
}
