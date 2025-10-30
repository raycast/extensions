import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { xai } from "@ai-sdk/xai";
import { streamText as vercelStreamText } from "ai";

export type ProviderName = "openai" | "anthropic" | "google" | "mistral" | "xai";

interface StreamTextOptions {
  provider: ProviderName;
  model: string;
  apiKey: string;
  prompt: string;
  system?: string;
}

export function mapModelName(provider: ProviderName, raycastModelId: string): string {
  const modelMappings: Record<ProviderName, Record<string, string>> = {
    openai: {
      "openai_o1-gpt-5": "gpt-4o",
      "openai-gpt-5-mini": "gpt-4o-mini",
      "openai-gpt-5-nano": "gpt-4o-mini",
      "openai-gpt-4.1": "gpt-4o",
      "openai-gpt-4.1-mini": "gpt-4o-mini",
      "openai-gpt-4.1-nano": "gpt-4o-mini",
      "openai-gpt-4": "gpt-4",
      "openai-gpt-4-turbo": "gpt-4-turbo",
      "openai-gpt-4o": "gpt-4o",
      "openai-gpt-4o-mini": "gpt-4o-mini",
      "openai_o1-o3": "o1",
      "openai_o1-o4-mini": "o1-mini",
      "openai_o1-o1": "o1",
      "openai_o1-o3-mini": "o1-mini",
    },
    anthropic: {
      "anthropic-claude-haiku": "claude-3-5-haiku-20241022",
      "anthropic-claude-sonnet": "claude-3-5-sonnet-20241022",
      "anthropic-claude-3-7-sonnet-latest": "claude-3-5-sonnet-20250131",
      "anthropic-claude-sonnet-4": "claude-sonnet-4-20250514",
      "anthropic-claude-opus-4": "claude-opus-4-20250514",
      "anthropic-claude-opus-4-1": "claude-opus-4.1-20250617",
    },
    google: {
      "google-gemini-2.5-pro": "gemini-2.5-pro",
      "google-gemini-2.5-flash": "gemini-2.5-flash",
      "google-gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
      "google-gemini-2.0-flash": "gemini-2.0-flash",
    },
    mistral: {
      "mistral-large": "mistral-large-latest",
      "mistral-mistral-medium-latest": "mistral-medium-latest",
      "mistral-small": "mistral-small-latest",
      "mistral-nemo": "mistral-nemo-latest",
      "mistral-codestral": "codestral-latest",
    },
    xai: {
      "xai-grok-4": "grok-4-latest",
      "xai-grok-3": "grok-3-latest",
      "xai-grok-3-mini": "grok-3-mini-latest",
      "xai-grok-2-latest": "grok-2-latest",
      "xai-grok-2": "grok-2-latest",
    },
  };

  return modelMappings[provider]?.[raycastModelId] || raycastModelId;
}

export async function streamText(options: StreamTextOptions) {
  const { provider, model, apiKey, prompt, system } = options;

  console.log(provider, model, apiKey, prompt, system);
  const mappedModel = mapModelName(provider, model);
  console.log(mappedModel);

  let modelInstance;

  if (provider === "openai") {
    const client = createOpenAI({ apiKey });
    modelInstance = client(mappedModel);
  } else if (provider === "anthropic") {
    const client = createAnthropic({ apiKey });
    modelInstance = client(mappedModel);
  } else if (provider === "google") {
    const client = createGoogleGenerativeAI({ apiKey });
    modelInstance = client(mappedModel);
  } else if (provider === "mistral") {
    process.env.MISTRAL_API_KEY = apiKey;
    modelInstance = mistral(mappedModel);
  } else if (provider === "xai") {
    process.env.XAI_API_KEY = apiKey;
    modelInstance = xai(mappedModel);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  console.log(modelInstance);

  return vercelStreamText({
    model: modelInstance,
    prompt,
    ...(system && { system }),
  });
}

export function getProviderName(provider: string): ProviderName | null {
  const providerMap: Record<string, ProviderName> = {
    OpenAI: "openai",
    Anthropic: "anthropic",
    Google: "google",
    Mistral: "mistral",
    xAI: "xai",
  };

  return providerMap[provider] || null;
}
