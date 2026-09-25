import { streamText } from "ai";
import { getPreferenceValues } from "@raycast/api";
import { createMetaClient } from "../model-provider";
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
  const client = createMetaClient(preferences.MODEL_API_KEY);
  const modelToUse = selectedModel || preferences.MUSE_MODEL || "muse-spark-1.3";

  const result = streamText({
    model: client(modelToUse),
    messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
  });

  let fullResponse = "";
  // textStream drops error parts, so read fullStream to surface API failures.
  for await (const part of result.fullStream) {
    if (part.type === "error") throw part.error instanceof Error ? part.error : new Error(String(part.error));
    if (part.type === "text-delta") {
      fullResponse += part.text;
      onUpdate(fullResponse);
    }
  }

  return { fullResponse, model: modelToUse };
}
