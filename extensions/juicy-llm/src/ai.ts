import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { getProviderConfig } from "./storage";
import type { ModelPreset, Provider } from "./types";
import { PROVIDER_LABELS } from "./types";

export async function resolveCredentials(
  provider: Provider,
): Promise<{ apiKey: string; baseUrl?: string }> {
  const config = await getProviderConfig(provider);
  const apiKey = config?.apiKey ?? "";
  const baseUrl = config?.baseUrl;

  return { apiKey, baseUrl };
}

async function createLanguageModel(preset: ModelPreset) {
  const { apiKey, baseUrl } = await resolveCredentials(preset.provider);

  if (preset.provider !== "ollama" && !apiKey) {
    throw new Error(
      `${PROVIDER_LABELS[preset.provider]} API key is not configured. Please set it in Manage Providers.`,
    );
  }

  switch (preset.provider) {
    case "openai":
      return createOpenAI({ apiKey })(preset.model);
    case "anthropic":
      return createAnthropic({ apiKey })(preset.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(preset.model);
    case "ollama":
      return createOllama({ baseURL: baseUrl ?? "http://localhost:11434/api" })(
        preset.model,
      );
    case "openrouter":
      return createOpenAI({
        apiKey,
        baseURL: baseUrl ?? "https://openrouter.ai/api/v1",
      })(preset.model);
  }
}

export interface StreamOptions {
  preset: ModelPreset;
  systemPrompt: string;
  userPrompt: string;
  abortSignal?: AbortSignal;
}

export async function streamLLM(options: StreamOptions) {
  const { preset, systemPrompt, userPrompt, abortSignal } = options;
  const model = await createLanguageModel(preset);

  return streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: preset.temperature,
    maxOutputTokens: preset.maxTokens,
    abortSignal,
  });
}
