import { streamText } from "ai";
import { getPreferenceValues } from "@raycast/api";
import { createZenClient, sessionHeaders } from "../model-provider";
import { DEFAULT_MODEL } from "../constants";
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
  const client = createZenClient(preferences.OPENCODE_API_KEY);
  const modelToUse = selectedModel || preferences.OPENCODE_MODEL || DEFAULT_MODEL;

  const result = streamText({
    model: client(modelToUse),
    messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
    headers: sessionHeaders(messages),
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
