import { AIProvider, ChatRequest, ChatResponse, StreamCallbacks, ProviderConfig, Message } from "./base";

export const API_ENDPOINTS = {
  international: "https://api.minimax.io/v1/chat/completions",
  china: "https://api.minimaxi.com/v1/chat/completions",
};

const REQUEST_TIMEOUT_MS = 60000; // 60 seconds timeout

interface MiniMaxChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

interface MiniMaxErrorResponse {
  error?: { message?: string };
  message?: string;
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
    this.model = config.model || "MiniMax-M2.7";
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.systemPrompt = config.systemPrompt;
    this.apiEndpoint = config.apiEndpoint || API_ENDPOINTS.international;
  }

  static async validateApiKey(apiKey: string, apiEndpoint: string): Promise<{ valid: boolean | null; error?: string }> {
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "MiniMax-M2.5",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 10,
        }),
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

  private removeThinking(content: string): string {
    // Remove <think>...</think> blocks (including multiline)
    return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.buildMessages(request.messages),
          temperature: request.temperature ?? this.defaultTemperature,
          max_tokens: request.maxTokens ?? this.defaultMaxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleError(response);
        throw error;
      }

      const data = (await response.json()) as MiniMaxChatResponse;
      const rawContent = data.choices?.[0]?.message?.content ?? "";
      return {
        content: this.removeThinking(rawContent),
        finishReason: data.choices?.[0]?.finish_reason,
      };
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
      response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.buildMessages(request.messages),
          temperature: request.temperature ?? this.defaultTemperature,
          max_tokens: request.maxTokens ?? this.defaultMaxTokens,
          stream: true,
        }),
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
            const content = json.choices?.[0]?.delta?.content;
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
