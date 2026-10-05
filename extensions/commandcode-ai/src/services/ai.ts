import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_MODEL, generate } from "../models";
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
  const modelToUse = selectedModel || preferences.COMMANDCODE_MODEL || DEFAULT_MODEL;

  const stream = generate(modelToUse, {
    messages: messages.map((msg) => ({ role: msg.role, content: [{ type: "text", text: msg.content }] })),
  });

  let fullResponse = "";
  for await (const part of stream) {
    if (part.type === "error") {
      const error = part.error as { message?: string } | string;
      throw new Error(typeof error === "string" ? error : (error?.message ?? "Stream error"));
    }
    if (part.type === "text-delta") {
      fullResponse += part.text ?? part.textDelta ?? "";
      onUpdate(fullResponse);
    }
  }

  return { fullResponse, model: modelToUse };
}
