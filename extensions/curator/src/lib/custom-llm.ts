const ANTHROPIC_VERSION = "2023-06-01";

export type CustomLLMProtocol = "openai" | "anthropic";

export interface CustomChatRequest {
  protocol: CustomLLMProtocol;
  url: string;
  init: RequestInit;
}

export function buildCustomChatRequest(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string,
): CustomChatRequest {
  if (isAnthropicCompatibleBaseURL(baseURL)) {
    return {
      protocol: "anthropic",
      url: anthropicMessagesUrl(baseURL),
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
          "api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 4096,
          thinking: { type: "disabled" },
        }),
      },
    };
  }

  return {
    protocol: "openai",
    url: `${baseURL.replace(/\/$/, "")}/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    },
  };
}

export function extractCustomChatText(
  json: unknown,
  protocol: CustomLLMProtocol,
): string {
  if (protocol === "anthropic") {
    const data = json as { content?: { type?: string; text?: unknown }[] };
    return (
      data.content
        ?.filter(
          (part) => part.type === "text" || typeof part.text === "string",
        )
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim() ?? ""
    );
  }

  const data = json as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

function isAnthropicCompatibleBaseURL(baseURL: string): boolean {
  return baseURL.replace(/\/+$/, "").toLowerCase().includes("/anthropic");
}

function anthropicMessagesUrl(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1/messages")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
}
