import OpenAI from "openai";
import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ModelResponse, TokenUsage } from "./token-usage";

function usageFromOpenAIUsage(
  u:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
): TokenUsage | undefined {
  if (!u || (u.prompt_tokens == null && u.completion_tokens == null && u.total_tokens == null)) {
    return undefined;
  }
  return {
    input: u.prompt_tokens,
    output: u.completion_tokens,
    total: u.total_tokens,
  };
}

export async function analyzeImageWithOpenAI(
  apiKey: string,
  model: string,
  base64Image: string,
  userPrompt: string,
  imageMediaType = "image/png",
): Promise<ModelResponse> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMediaType};base64,${base64Image}`,
              detail: "auto",
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  const text = response.choices[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error("The model returned an empty response.");
  }
  return { text: text.trim(), usage: usageFromOpenAIUsage(response.usage ?? undefined) };
}

export async function chatWithHistoryOpenAI(
  apiKey: string,
  model: string,
  messages: ChatCompletionMessageParam[],
): Promise<ModelResponse> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 8192,
  });

  const text = response.choices[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error("The model returned an empty response.");
  }
  return { text: text.trim(), usage: usageFromOpenAIUsage(response.usage ?? undefined) };
}

export async function analyzeTextWithOpenAI(
  apiKey: string,
  model: string,
  userMessage: string,
): Promise<ModelResponse> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 8192,
  });

  const text = response.choices[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error("The model returned an empty response.");
  }
  return { text: text.trim(), usage: usageFromOpenAIUsage(response.usage ?? undefined) };
}

export function formatOpenAIError(err: unknown): string {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: number }).status;
    if (status === 401) {
      return `Invalid API key. Check your OpenAI API key in ${EXTENSION_DISPLAY_NAME} preferences.`;
    }
    if (status === 429) {
      return "Rate limited by OpenAI. Try again in a moment.";
    }
    if (status === 400) {
      const msg = (err as { message?: string }).message;
      return msg ? `OpenAI request error: ${msg}` : "Invalid request to OpenAI (check model name and image size).";
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
