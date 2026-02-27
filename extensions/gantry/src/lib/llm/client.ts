import type { GantryConfig } from "../config/types";
import { AVAILABLE_MODELS } from "../config/models";

export interface LLMCallOptions {
  systemPrompt: string;
  userMessage: string;
  signal?: AbortSignal;
}

async function callAnthropic(
  apiKey: string,
  modelId: string,
  options: LLMCallOptions,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      system: options.systemPrompt,
      messages: [{ role: "user", content: options.userMessage }],
    }),
    signal: options.signal,
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  return data.content[0]?.text ?? "";
}

async function callGoogle(
  apiKey: string,
  modelId: string,
  options: LLMCallOptions,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.systemPrompt }] },
      contents: [{ parts: [{ text: options.userMessage }] }],
    }),
    signal: options.signal,
  });
  if (!res.ok) throw new Error(`Google API error: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(
  apiKey: string,
  modelId: string,
  options: LLMCallOptions,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
      max_tokens: 1024,
    }),
    signal: options.signal,
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callLLM(
  config: GantryConfig,
  options: LLMCallOptions,
): Promise<string> {
  const modelId = config.llm.selectedModel;
  if (!modelId) throw new Error("No model selected");

  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = config.llm.apiKeys[model.provider];
  if (!apiKey) throw new Error(`No API key for ${model.provider}`);

  switch (model.provider) {
    case "anthropic":
      return callAnthropic(apiKey, modelId, options);
    case "google":
      return callGoogle(apiKey, modelId, options);
    case "openai":
      return callOpenAI(apiKey, modelId, options);
  }
}
