import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getPreferenceValues } from "@raycast/api";
import { META_BASE_URL } from "../model-provider";
import type { Message } from "../types";

export interface StreamResponse {
  fullResponse: string;
  model: string;
}

export async function streamAIResponse(
  messages: Message[],
  onUpdate: (text: string) => void,
  selectedModel?: string,
): Promise<StreamResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const client = createOpenAI({ apiKey: preferences.MODEL_API_KEY, baseURL: META_BASE_URL });
  const modelToUse = selectedModel || preferences.MUSE_MODEL || "muse-spark-1.3";

  const result = streamText({
    model: client(modelToUse),
    messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
  });

  let fullResponse = "";
  for await (const textPart of result.textStream) {
    fullResponse += textPart;
    onUpdate(fullResponse);
  }

  return { fullResponse, model: modelToUse };
}
