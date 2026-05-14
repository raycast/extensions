import { streamText, type LanguageModelUsage } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { getPreferenceValues } from "@raycast/api";
import type { Message, AIPreferences, ModelResponse } from "../types";

export interface StreamResponse {
  fullResponse: string;
  usage: LanguageModelUsage;
  finishReason: string;
  model: string;
}

export async function streamAIResponse(
  messages: Message[],
  onUpdate: (text: string) => void,
  selectedModel?: string,
): Promise<StreamResponse> {
  const preferences = getPreferenceValues<AIPreferences>();
  const gateway = createGateway({
    apiKey: preferences.AI_GATEWAY_API_KEY,
  });

  const modelToUse = selectedModel || preferences.AI_MODEL;

  const result = streamText({
    model: gateway(modelToUse),
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  let fullResponse = "";

  for await (const textPart of result.textStream) {
    fullResponse += textPart;
    onUpdate(fullResponse);
  }

  const usage = await result.usage;
  const finishReason = await result.finishReason;

  console.log("Token usage:", usage);
  console.log("Finish reason:", finishReason);

  return {
    fullResponse,
    usage,
    finishReason,
    model: modelToUse,
  };
}

export async function askMultipleModels(
  messages: Message[],
  models: string[],
  onUpdateModel: (model: string, text: string) => void,
): Promise<ModelResponse[]> {
  const preferences = getPreferenceValues<AIPreferences>();
  const gateway = createGateway({
    apiKey: preferences.AI_GATEWAY_API_KEY,
  });

  const messagesFormatted = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const responses: Record<string, string> = {};
  const statuses: Record<string, "completed" | "error"> = {};
  const errors: Record<string, Error> = {};

  models.forEach((model) => {
    responses[model] = "";
  });

  await Promise.allSettled(
    models.map(async (model) => {
      try {
        const result = streamText({
          model: gateway(model),
          messages: messagesFormatted,
        });

        for await (const textPart of result.textStream) {
          responses[model] += textPart;
          onUpdateModel(model, responses[model]);
        }

        await result.usage;
        await result.finishReason;

        statuses[model] = "completed";
      } catch (error) {
        console.error(`Error generating response for model ${model}:`, error);
        statuses[model] = "error";
        errors[model] = error as Error;
        responses[model] = "";
      }
    }),
  );

  return models.map((model) => ({
    model,
    response: responses[model],
    status: statuses[model],
    error: errors[model],
  }));
}
