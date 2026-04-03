import { TONE_PROMPTS } from "./tones";

export interface RewriteOptions {
  text: string;
  tone: string;
  provider: string;
  apiKey: string;
  model: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  groq: "llama-3.3-70b-versatile",
};

const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
};

export async function rewriteText(
  options: RewriteOptions,
  signal?: AbortSignal,
): Promise<string> {
  const { provider } = options;
  const model = options.model || DEFAULT_MODELS[provider] || "gpt-4o-mini";
  const systemPrompt = TONE_PROMPTS[options.tone] || TONE_PROMPTS.professional;

  switch (provider) {
    case "openai":
    case "groq":
      return callOpenAICompatible(
        PROVIDER_URLS[provider],
        { ...options, model },
        systemPrompt,
        signal,
      );

    case "anthropic":
      return callAnthropic({ ...options, model }, systemPrompt, signal);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function sanitizeError(message: string, apiKey: string): string {
  if (!apiKey || apiKey.trim().length === 0) return message;
  return message.replaceAll(apiKey, "[REDACTED]");
}

async function callOpenAICompatible(
  baseUrl: string,
  options: RewriteOptions,
  systemPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const { text, apiKey, model } = options;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API error (${response.status}): ${sanitizeError(errorBody, apiKey)}`,
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in API response");
  }
  return content.trim();
}

async function callAnthropic(
  options: RewriteOptions,
  systemPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const { text, apiKey, model } = options;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API error (${response.status}): ${sanitizeError(errorBody, apiKey)}`,
    );
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const content = data.content?.find((block) => block.type === "text")?.text;
  if (!content) {
    throw new Error("No text content in Anthropic response");
  }
  return content.trim();
}
