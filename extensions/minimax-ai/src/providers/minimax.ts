import { AIProvider, ChatRequest, ChatResponse, StreamCallbacks, ProviderConfig, Message } from "./base";

export const API_ENDPOINTS = {
  international: "https://api.minimax.io/v1/chat/completions",
  china: "https://api.minimaxi.com/anthropic",
};

const REQUEST_TIMEOUT_MS = 60000; // 60 seconds timeout
const ANTHROPIC_VERSION = "2023-06-01";

interface MiniMaxChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

interface MiniMaxAnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
}

interface MiniMaxErrorResponse {
  error?: { message?: string };
  message?: string;
}

function isChatCompletionResponse(data: MiniMaxChatResponse | MiniMaxAnthropicResponse): data is MiniMaxChatResponse {
  return Array.isArray((data as MiniMaxChatResponse).choices);
}

export class MiniMaxProvider implements AIProvider {
  name = "MiniMax";
  private apiKey: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private systemPrompt?: string;
  private apiEndpoint: string;

  constructor(config: ProviderConfig & { apiEndpoint?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || "MiniMax-M2.7-highspeed";
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.systemPrompt = config.systemPrompt;
    this.apiEndpoint = config.apiEndpoint || API_ENDPOINTS.china;
  }

  static async validateApiKey(apiKey: string, apiEndpoint: string): Promise<{ valid: boolean | null; error?: string }> {
    try {
      const anthropic = MiniMaxProvider.isAnthropicEndpoint(apiEndpoint);
      const response = await fetch(MiniMaxProvider.requestUrlForEndpoint(apiEndpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(anthropic
            ? {
                "x-api-key": apiKey,
                "api-key": apiKey,
                "anthropic-version": ANTHROPIC_VERSION,
              }
            : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          MiniMaxProvider.buildRequestBody(
            "MiniMax-M2.7-highspeed",
            [{ role: "user", content: "Hi" }],
            0.7,
            10,
            false,
            anthropic,
          ),
        ),
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { valid: false, error: "Invalid API key" };
      }

      // Non-401 HTTP errors (rate limits, server errors) are transient; treat as unknown
      return { valid: null };
    } catch {
      // Network errors leave validation state as unknown so requests can still proceed
      return { valid: null };
    }
  }

  private buildMessages(messages: Message[]): Message[] {
    if (this.systemPrompt && messages[0]?.role !== "system") {
      return [{ role: "system", content: this.systemPrompt }, ...messages];
    }
    return messages;
  }

  private static isAnthropicEndpoint(apiEndpoint: string): boolean {
    return apiEndpoint.replace(/\/+$/, "").toLowerCase().includes("/anthropic");
  }

  private get isAnthropicEndpoint(): boolean {
    return MiniMaxProvider.isAnthropicEndpoint(this.apiEndpoint);
  }

  private static requestUrlForEndpoint(apiEndpoint: string): string {
    const trimmed = apiEndpoint.replace(/\/+$/, "");
    if (MiniMaxProvider.isAnthropicEndpoint(apiEndpoint)) {
      if (trimmed.endsWith("/v1/messages")) return trimmed;
      if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
      return `${trimmed}/v1/messages`;
    }
    return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
  }

  private endpointUrl(): string {
    return MiniMaxProvider.requestUrlForEndpoint(this.apiEndpoint);
  }

  private static buildRequestBody(
    model: string,
    messages: Message[],
    temperature: number,
    maxTokens: number,
    stream: boolean,
    anthropic: boolean,
  ): Record<string, unknown> {
    if (!anthropic) {
      return {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
      };
    }

    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const chatMessages = messages.filter((message) => message.role !== "system");

    return {
      model,
      ...(system ? { system } : {}),
      messages: chatMessages.length ? chatMessages : [{ role: "user", content: "Hi" }],
      temperature,
      max_tokens: maxTokens,
      stream,
      thinking: { type: "disabled" },
    };
  }

  private requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    if (this.isAnthropicEndpoint) {
      headers["x-api-key"] = this.apiKey;
      headers["api-key"] = this.apiKey;
      headers["anthropic-version"] = ANTHROPIC_VERSION;
    }
    return headers;
  }

  private removeThinking(content: string): string {
    // Remove <think>...</think> blocks (including multiline)
    return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }

  private contentFromResponse(data: MiniMaxChatResponse | MiniMaxAnthropicResponse): ChatResponse {
    if (isChatCompletionResponse(data)) {
      const rawContent = data.choices?.[0]?.message?.content ?? "";
      return {
        content: this.removeThinking(rawContent),
        finishReason: data.choices?.[0]?.finish_reason,
      };
    }

    const rawContent =
      data.content
        ?.filter((part) => part.type === "text" || typeof part.text === "string")
        .map((part) => part.text ?? "")
        .join("") ?? "";
    return {
      content: this.removeThinking(rawContent),
      finishReason: data.stop_reason,
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpointUrl(), {
        method: "POST",
        headers: this.requestHeaders(),
        body: JSON.stringify(
          MiniMaxProvider.buildRequestBody(
            this.model,
            this.buildMessages(request.messages),
            request.temperature ?? this.defaultTemperature,
            request.maxTokens ?? this.defaultMaxTokens,
            false,
            this.isAnthropicEndpoint,
          ),
        ),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleError(response);
        throw error;
      }

      const data = (await response.json()) as MiniMaxChatResponse | MiniMaxAnthropicResponse;
      return this.contentFromResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw error;
    }
  }

  async chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(this.endpointUrl(), {
        method: "POST",
        headers: this.requestHeaders(),
        body: JSON.stringify(
          MiniMaxProvider.buildRequestBody(
            this.model,
            this.buildMessages(request.messages),
            request.temperature ?? this.defaultTemperature,
            request.maxTokens ?? this.defaultMaxTokens,
            true,
            this.isAnthropicEndpoint,
          ),
        ),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        callbacks.onError(new Error("Request timed out"));
        return;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    if (!response.ok) {
      const error = await this.handleError(response);
      callbacks.onError(error);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error("No response body"));
      return;
    }

    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";
    let insideThinking = false;
    let thinkingBuffer = "";

    try {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;
        const value = result.value;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content ?? json.delta?.text;
            if (content) {
              // Filter out <think>...</think> content during streaming
              let processedContent = "";
              for (const char of content) {
                thinkingBuffer += char;

                if (!insideThinking && thinkingBuffer.endsWith("<think>")) {
                  insideThinking = true;
                  thinkingBuffer = "";
                } else if (insideThinking && thinkingBuffer.endsWith("</think>")) {
                  insideThinking = false;
                  thinkingBuffer = "";
                } else if (!insideThinking) {
                  // Only output if we're not potentially in a tag
                  if (thinkingBuffer.length > 7) {
                    processedContent += thinkingBuffer[0];
                    thinkingBuffer = thinkingBuffer.slice(1);
                  }
                }
              }

              if (processedContent) {
                fullResponse += processedContent;
                callbacks.onToken(processedContent);
              }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      // Flush remaining buffer if not inside thinking
      if (!insideThinking && thinkingBuffer) {
        fullResponse += thinkingBuffer;
        callbacks.onToken(thinkingBuffer);
      }

      callbacks.onComplete(fullResponse);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleError(response: Response): Promise<Error> {
    let message = `API Error: ${response.status}`;

    try {
      const data = (await response.json()) as MiniMaxErrorResponse;
      message = data.error?.message || data.message || message;
    } catch {
      // Use default message
    }

    switch (response.status) {
      case 401:
        return new APIKeyError(message);
      case 429:
        return new RateLimitError(message);
      default:
        if (response.status >= 500) {
          return new ServerError(message);
        }
        return new Error(message);
    }
  }
}

export class APIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "APIKeyError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}
