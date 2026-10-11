import { streamText } from "ai";
import type { Action } from "../types";
import { assertNoApiKeysInPrompt, getModel, getReasoningLevel, supportsTemperature } from "./OpenAI";

export async function generateActionResponse(action: Action, prompt: string, signal: AbortSignal, onText: (text: string) => void) {
  assertNoApiKeysInPrompt(prompt, action.systemPrompt);
  const reasoningLevel = getReasoningLevel(action.model, action.reasoningLevel);
  const response = streamText({
    model: getModel(action.model),
    instructions: action.systemPrompt,
    prompt,
    reasoning: reasoningLevel === "default" ? undefined : reasoningLevel,
    temperature: supportsTemperature(action.model, reasoningLevel) ? parseFloat(action.temperature) : undefined,
    maxOutputTokens: +action.maxTokens === -1 ? undefined : +action.maxTokens,
    providerOptions: { openai: { store: false } },
    abortSignal: signal,
    onError: () => {
      // Errors are handled below and shown in Raycast instead of only being logged.
    },
  });

  let text = "";
  for await (const part of response.fullStream) {
    if (part.type === "error") {
      throw part.error;
    }

    if (part.type === "text-delta") {
      text += part.text;
      onText(text);
    }
  }

  signal.throwIfAborted();
  const usage = await response.totalUsage;
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;

  return {
    text,
    tokens: { input, output, total: usage.totalTokens ?? input + output },
  };
}
