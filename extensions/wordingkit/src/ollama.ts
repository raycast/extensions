import type { EditingMode } from "./modes.ts";

export interface OllamaResponse {
  error?: string;
  message?: { content?: string };
}

export function buildOllamaRequest(text: string, mode: EditingMode) {
  return {
    model: mode.model,
    stream: false,
    think: false,
    options: {
      temperature: mode.temperature,
      num_predict: mode.maxTokens,
      top_p: 0.9,
      repeat_penalty: 1.05,
    },
    messages: [
      { role: "system", content: mode.systemPrompt },
      { role: "user", content: text },
    ],
  };
}

export function extractOllamaContent(payload: OllamaResponse): string {
  if (payload.error) throw new Error(payload.error);
  const content = payload.message?.content?.trim();
  if (!content) throw new Error("Ollama returned an empty response");
  return content;
}
