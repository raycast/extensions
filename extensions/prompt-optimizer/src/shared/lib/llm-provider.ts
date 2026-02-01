import OpenAI from "openai";
import { DEFAULT_OPENAI_EXECUTION_MODEL } from "shared/constants";
import { LLMProviderPreferences, LLMApiProviderType } from "shared/types";

export class LLMProviderError extends Error {
  public status?: number;
  constructor(info: { status?: number; message: string } | string) {
    super(typeof info === "string" ? info : info.message);
    this.name = "LLMProviderError";
    if (typeof info !== "string") {
      this.status = info.status;
    }
  }
}

export type LLMProviderErrorInfo = {
  status?: number;
  message: string;
};

type LLMProviderInitParams = {
  provider: LLMApiProviderType;
  apiKey: string;
  apiBaseUrl?: string;
  model?: string;
  defaultHeaders?: Record<string, string>;
};

type MakeParsedRequestOptions = {
  input: string;
  instructions: string;
  responseJsonSchema: Record<string, unknown>;
};

export class LLMProvider {
  private model: string;
  private openaiClient: OpenAI;
  private providerType: LLMApiProviderType;

  constructor(params: LLMProviderInitParams) {
    if (params.provider === "openai-compatible") {
      if (!params.apiBaseUrl) {
        throw new LLMProviderError("API Base URL is required for openai-compatible providers");
      }
      if (!params.model) {
        throw new LLMProviderError("Model is required for openai-compatible providers");
      }
    }
    this.providerType = params.provider;
    this.model = params.model ?? (params.provider === "openai" ? DEFAULT_OPENAI_EXECUTION_MODEL : undefined!);
    this.openaiClient = new OpenAI({
      apiKey: params.apiKey,
      baseURL: params.apiBaseUrl,
      defaultHeaders: params.defaultHeaders,
      logLevel: "debug",
    });
  }

  public async request<T>(options: MakeParsedRequestOptions): Promise<T> {
    try {
      if (this.providerType === "openai") {
        return this.createParsedResponse(options);
      } else {
        return this.createParsedChatCompletion(options);
      }
    } catch (error) {
      throw this.ensureApiProviderError(error);
    }
  }

  public static fromPreferences(preferences: LLMProviderPreferences): LLMProvider {
    return new LLMProvider({
      provider: preferences.apiProviderType,
      apiKey: preferences.apiKey,
      apiBaseUrl: preferences.apiBaseUrl,
      model: preferences.model,
      defaultHeaders: parseDefaultHeaders(preferences.defaultHeaders),
    });
  }

  private async createParsedResponse<T>(options: MakeParsedRequestOptions): Promise<T> {
    const response = await this.openaiClient.responses.parse({
      model: this.model,
      text: {
        format: {
          strict: true,
          type: "json_schema",
          name: "response_schema",
          schema: options.responseJsonSchema,
        },
      },
      input: options.input,
      instructions: options.instructions,
    });

    if (!response.output_parsed) {
      throw new LLMProviderError("OpenAI response parsing failed");
    }

    return response.output_parsed as T;
  }

  private async createParsedChatCompletion<T>(options: MakeParsedRequestOptions) {
    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      response_format: {
        type: "json_schema",
        json_schema: {
          strict: true,
          name: "response_schema",
          schema: options.responseJsonSchema,
        },
      },
      messages: [
        {
          role: "system",
          content: options.instructions,
        },
        {
          role: "user",
          content: options.input,
        },
      ],
    });

    const content = this.normalizeChatContent(response.choices?.[0]?.message?.content);

    if (!content) {
      throw new LLMProviderError("LLM returned empty response");
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      throw new LLMProviderError("LLM response parsing failed");
    }
  }

  private normalizeChatContent(content: unknown): string | null {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
            return item.text;
          }
          return "";
        })
        .join("");
      return text.trim().length > 0 ? text : null;
    }
    return null;
  }

  private ensureApiProviderError(error: unknown): LLMProviderError {
    if (error instanceof LLMProviderError) {
      return error;
    }

    if (typeof error === "object" && error !== null) {
      const maybeStatus = (error as { status?: number }).status;
      const maybeMessage = (error as { message?: string }).message;
      return new LLMProviderError({
        status: typeof maybeStatus === "number" ? maybeStatus : undefined,
        message: typeof maybeMessage === "string" && maybeMessage.length > 0 ? maybeMessage : "API request failed",
      });
    }

    if (error instanceof Error) {
      return new LLMProviderError(error.message ?? "API request failed");
    }

    return new LLMProviderError("API request failed");
  }
}

function parseDefaultHeaders(value?: string): Record<string, string> | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const headers: Record<string, string> = {};
  const parts = trimmed.split(";");

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.length === 0) {
      continue;
    }
    const separatorIndex = part.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex === part.length - 1) {
      throw new LLMProviderError("Default headers must use format: key1: value; key2:value; key3:value");
    }
    const key = part.slice(0, separatorIndex).trim();
    const headerValue = part.slice(separatorIndex + 1).trim();
    if (!key || !headerValue) {
      throw new LLMProviderError("Default headers must use format: key1: value; key2:value; key3:value");
    }
    headers[key] = headerValue;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}
