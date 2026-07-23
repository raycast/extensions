export type Provider = "openai" | "anthropic" | "openrouter";

export const SYSTEM_PROMPT =
  "You are a writing assistant. Rewrite the user's message to sound natural, clear, and friendly while preserving its original meaning and intent. Only return the rewritten text, with no extra commentary, quotes, or explanation.";

interface OpenAIChatResponse {
  choices: Array<{ message: { content: string } }>;
}

interface AnthropicMessagesResponse {
  content: Array<{ type: string; text?: string }>;
}

export interface ProviderRequest {
  url: string;
  init: RequestInit;
}

export function buildRequest(
  provider: Provider,
  apiKey: string,
  text: string,
): ProviderRequest {
  switch (provider) {
    case "openai":
      return buildOpenAIStyleRequest(
        "https://api.openai.com/v1/chat/completions",
        "gpt-4o-mini",
        apiKey,
        text,
      );
    case "openrouter":
      return buildOpenAIStyleRequest(
        "https://openrouter.ai/api/v1/chat/completions",
        "openai/gpt-4o-mini",
        apiKey,
        text,
      );
    case "anthropic":
      return buildAnthropicRequest(apiKey, text);
  }
}

function buildOpenAIStyleRequest(
  url: string,
  model: string,
  apiKey: string,
  text: string,
): ProviderRequest {
  return {
    url,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    },
  };
}

function buildAnthropicRequest(apiKey: string, text: string): ProviderRequest {
  return {
    url: "https://api.anthropic.com/v1/messages",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    },
  };
}

export function parseResponse(provider: Provider, json: unknown): string {
  if (provider === "anthropic") {
    const response = json as AnthropicMessagesResponse;
    const textBlock = response.content?.find((block) => block.type === "text");
    if (!textBlock?.text) {
      throw new Error("Anthropic response did not contain any text content.");
    }
    return textBlock.text.trim();
  }

  const response = json as OpenAIChatResponse;
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(
      `${provider} response did not contain any message content.`,
    );
  }
  return content.trim();
}
