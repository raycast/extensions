import { buildTranslationPrompt } from "./prompt";
import { ProviderConfig, TranslationRequest } from "./types";

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
}

interface AnthropicCompatibleResponse {
  content?: Array<{
    type?: string;
    text?: string;
    thinking?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
  };
}

export async function translateWithProvider(config: ProviderConfig, request: TranslationRequest): Promise<string> {
  if (!config.apiKey) {
    throw new MissingAPIKeyError(`${config.title} API key is not configured.`);
  }

  if (config.id === "gemini") {
    return translateWithGemini(config, request);
  }

  if (config.apiProtocol === "anthropic") {
    return translateWithAnthropicCompatible(config, request);
  }

  return translateWithOpenAICompatible(config, request);
}

export class MissingAPIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingAPIKeyError";
  }
}

async function translateWithOpenAICompatible(config: ProviderConfig, request: TranslationRequest): Promise<string> {
  const prompt = buildTranslationPrompt(request);
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.2,
    stream: false,
  };

  if (usesMaxCompletionTokens(config.id)) {
    body.max_completion_tokens = request.maxOutputTokens;
  } else {
    body.max_tokens = request.maxOutputTokens;
  }

  if (config.id === "kimi") {
    body.thinking = { type: "disabled" };
  }

  if (config.id === "kimi" && config.model === "kimi-k2.6") {
    delete body.temperature;
  }

  const response = await postJson<OpenAICompatibleResponse>(
    chatCompletionsUrl(config.baseURL),
    request.timeoutMs,
    {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  );

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(extractErrorMessage(response) ?? `${config.title} returned an empty response.`);
  }

  return cleanModelOutput(content);
}

function usesMaxCompletionTokens(providerId: ProviderConfig["id"]): boolean {
  return providerId === "mimo";
}

async function translateWithAnthropicCompatible(config: ProviderConfig, request: TranslationRequest): Promise<string> {
  const prompt = buildTranslationPrompt(request);
  const response = await postJson<AnthropicCompatibleResponse>(
    anthropicMessagesUrl(config.baseURL),
    request.timeoutMs,
    {
      Authorization: `Bearer ${config.apiKey}`,
      "x-api-key": config.apiKey,
      "api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    {
      model: config.model,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      max_tokens: request.maxOutputTokens,
      temperature: 0.2,
      stream: false,
    },
  );

  const content = response.content
    ?.filter((part) => part.type === "text" || part.text)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!content) {
    throw new Error(response.error?.message ?? `${config.title} returned an empty response.`);
  }

  return cleanModelOutput(content);
}

async function translateWithGemini(config: ProviderConfig, request: TranslationRequest): Promise<string> {
  const prompt = buildTranslationPrompt(request);
  const body = {
    system_instruction: {
      parts: [{ text: prompt.system }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt.user }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: request.maxOutputTokens,
    },
  };

  const response = await postJson<GeminiResponse>(
    geminiGenerateContentUrl(config.baseURL, config.model),
    request.timeoutMs,
    {
      "x-goog-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body,
  );

  const content = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!content) {
    throw new Error(response.error?.message ?? `${config.title} returned an empty response.`);
  }

  return cleanModelOutput(content);
}

async function postJson<T>(url: string, timeoutMs: number, headers: Record<string, string>, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const responseText = await response.text();
    const data = safeParseJson(responseText);

    if (!response.ok) {
      throw new Error(extractErrorMessage(data) ?? `HTTP ${response.status}: ${responseText.slice(0, 240)}`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function chatCompletionsUrl(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

function anthropicMessagesUrl(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  return trimmed.endsWith("/v1/messages") ? trimmed : `${trimmed}/v1/messages`;
}

function geminiGenerateContentUrl(baseURL: string, model: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  const modelName = model.replace(/^models\//, "");
  return `${trimmed}/models/${encodeURIComponent(modelName)}:generateContent`;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as OpenAICompatibleResponse & GeminiResponse & AnthropicCompatibleResponse;
  return payload.error?.message ?? payload.base_resp?.status_msg;
}

function cleanModelOutput(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
