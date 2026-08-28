/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { ProviderConfig } from "@/providers/shared/config";
import { TranslationType } from "@/types/api";

import { BaseOpenAICompatibleTranslateProvider } from "./base";

const REASONING_MODEL_PATTERN = /^(o1|o3|gpt-5)/i;
const KNOWN_ENDPOINTS = ["https://api.openai.com/"];
const DEFAULT_MAX_TOKENS = 2000;

export class OpenAITranslateProvider extends BaseOpenAICompatibleTranslateProvider {
  type = TranslationType.OpenAI;

  protected getEndpoint() {
    // For historical reasons, the default endpoint includes /chat/completions
    return ProviderConfig.openAIEndpoint.replace(/\/chat\/completions$/, "");
  }

  protected getModel() {
    return ProviderConfig.openAIModel;
  }

  protected getAPIKey() {
    return ProviderConfig.openAIAPIKey;
  }

  protected getTokenLimitParams() {
    const endpoint = this.getEndpoint();
    const isKnownEndpoint = KNOWN_ENDPOINTS.some((knownEndpoint) => endpoint.startsWith(knownEndpoint));
    const isReasoningModel = REASONING_MODEL_PATTERN.test(this.getModel());

    // Only use max_completion_tokens if the user explicitly forces it,
    // OR if we are sure this is the official OpenAI endpoint and it's a reasoning model.
    // This prevents crashing 3rd-party proxies that don't support max_completion_tokens.
    const useMaxCompletionTokens = ProviderConfig.forceMaxCompletionTokens || (isKnownEndpoint && isReasoningModel);

    if (useMaxCompletionTokens) return { max_completion_tokens: DEFAULT_MAX_TOKENS };
    return { max_tokens: DEFAULT_MAX_TOKENS };
  }
}
