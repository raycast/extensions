import { stream } from "../models";
import type { Message } from "./types";

export const STREAMING_CURSOR = " ▊";
export const NAVIGATION_DELAY = 100;

export async function streamAIResponse(messages: Message[], model: string, onUpdate: (text: string) => void) {
  const result = stream(model, {
    messages: messages.map(({ role, content }) => ({ role, content: [{ type: "text" as const, text: content }] })),
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
  return fullResponse;
}
