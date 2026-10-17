import { stream } from "../models";
import type { Message } from "./types";

export const STREAMING_CURSOR = " ▊";
export const NAVIGATION_DELAY = 100;

export async function streamAIResponse(
  messages: Message[],
  model: string,
  onUpdate: (text: string) => void,
): Promise<Message> {
  const result = stream(model, {
    messages: messages.map(({ role, content, reasoning }) =>
      role === "user"
        ? { role, content: [{ type: "text", text: content }] }
        : {
            role,
            content: [
              ...(reasoning ? [{ type: "reasoning" as const, text: reasoning }] : []),
              { type: "text", text: content },
            ],
          },
    ),
  });
  let content = "";
  let reasoning = "";
  // textStream drops error parts, so read fullStream to surface API failures.
  for await (const part of result.fullStream) {
    if (part.type === "error") throw part.error instanceof Error ? part.error : new Error(String(part.error));
    if (part.type === "reasoning-delta") reasoning += part.text;
    if (part.type === "text-delta") {
      content += part.text;
      onUpdate(content);
    }
  }
  return { role: "assistant", content, ...(reasoning && { reasoning }) };
}
