import { getPreferenceValues } from "@raycast/api";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public rawError?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

interface Preferences {
  openaiApiUrl?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: "stop" | "tool_calls" | "length";
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: "stop" | "tool_calls" | "length" | null;
  }[];
}

class OpenAIClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.baseUrl = (prefs.openaiApiUrl || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    this.apiKey = prefs.openaiApiKey || "";
    this.model = prefs.openaiModel || "gpt-4o";
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      tools?: ToolDefinition[];
      stream?: false;
      temperature?: number;
    },
  ): Promise<ChatCompletionResponse>;
  async chat(
    messages: ChatMessage[],
    options: {
      tools?: ToolDefinition[];
      stream: true;
      temperature?: number;
    },
  ): Promise<AsyncGenerator<StreamChunk>>;
  async chat(
    messages: ChatMessage[],
    options?: {
      tools?: ToolDefinition[];
      stream?: boolean;
      temperature?: number;
    },
  ): Promise<ChatCompletionResponse | AsyncGenerator<StreamChunk>> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
    };

    if (options?.tools?.length) {
      body.tools = options.tools;
    }

    if (options?.stream) {
      body.stream = true;
      return this.streamChat(body);
    }

    return this.fetchWithRetry(body);
  }

  private async fetchWithRetry(
    body: Record<string, unknown>,
    maxRetries = 3,
  ): Promise<ChatCompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          return response.json() as Promise<ChatCompletionResponse>;
        }

        const errorText = await response.text();
        let errorMessage = `API Error (${response.status})`;

        // Parse specific error types
        if (response.status === 429) {
          // Rate limit - extract retry-after if available
          const retryAfter = response.headers.get("retry-after");
          const waitTime = retryAfter
            ? parseInt(retryAfter)
            : Math.pow(2, attempt + 1);

          if (attempt < maxRetries - 1) {
            await this.sleep(waitTime * 1000);
            continue;
          }
          errorMessage = `Rate limited. Please wait ${waitTime}s and try again.`;
        } else if (response.status === 401) {
          errorMessage = "Invalid API key. Check your settings.";
        } else if (response.status === 400) {
          errorMessage =
            "Bad request. The model may not support this operation.";
        } else if (response.status >= 500) {
          if (attempt < maxRetries - 1) {
            await this.sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          errorMessage = "Server error. Please try again later.";
        }

        throw new APIError(errorMessage, response.status, errorText);
      } catch (error) {
        if (error instanceof APIError) {
          throw error;
        }
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error("Failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async *streamChat(
    body: Record<string, unknown>,
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const chunk = JSON.parse(trimmed.slice(6)) as StreamChunk;
            yield chunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API Error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      data: { embedding: number[] }[];
    };
    return data.data[0].embedding;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }
}

let clientInstance: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!clientInstance) {
    clientInstance = new OpenAIClient();
  }
  return clientInstance;
}

export function resetOpenAIClient(): void {
  clientInstance = null;
}
