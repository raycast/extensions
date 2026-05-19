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

export interface GenerationOptions {
  responseMimeType?: string;
  responseJsonSchema?: Record<string, unknown>;
}

export async function translateWithProvider(config: ProviderConfig, request: TranslationRequest): Promise<string> {
  if (!config.apiKey) {
    throw new MissingAPIKeyError(`${config.title} API key is not configured.`);
  }
  validateProviderConfig(config);

  try {
    if (config.id === "gemini") {
      return await translateWithGemini(config, request);
    }
    if (config.apiProtocol === "anthropic") {
      return await translateWithAnthropicCompatible(config, request);
    }
    return await translateWithOpenAICompatible(config, request);
  } catch (error) {
    throw refineProviderError(error, config);
  }
}

export async function generateWithProvider(
  config: ProviderConfig,
  prompt: { system: string; user: string },
  timeoutMs: number,
  maxOutputTokens: number,
  options: GenerationOptions = {},
): Promise<string> {
  if (!config.apiKey) {
    throw new MissingAPIKeyError(`${config.title} API key is not configured.`);
  }
  validateProviderConfig(config);

  try {
    if (config.id === "gemini") {
      return await generateWithGeminiProtocol(config, prompt, timeoutMs, maxOutputTokens, options);
    }
    if (config.apiProtocol === "anthropic") {
      return await generateWithAnthropicProtocol(config, prompt, timeoutMs, maxOutputTokens);
    }
    return await generateWithOpenAIProtocol(config, prompt, timeoutMs, maxOutputTokens);
  } catch (error) {
    throw refineProviderError(error, config);
  }
}

async function generateWithGeminiProtocol(
  config: ProviderConfig,
  prompt: { system: string; user: string },
  timeoutMs: number,
  maxOutputTokens: number,
  options: GenerationOptions = {},
): Promise<string> {
  const generationConfig: Record<string, unknown> = { temperature: 0.3, maxOutputTokens };
  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }
  if (options.responseJsonSchema) {
    generationConfig.responseJsonSchema = options.responseJsonSchema;
  }

  const response = await postJson<GeminiResponse>(
    geminiGenerateContentUrl(config.baseURL, config.model),
    timeoutMs,
    {
      "x-goog-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    {
      system_instruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: "user", parts: [{ text: prompt.user }] }],
      generationConfig,
    },
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

async function generateWithAnthropicProtocol(
  config: ProviderConfig,
  prompt: { system: string; user: string },
  timeoutMs: number,
  maxOutputTokens: number,
): Promise<string> {
  const response = await postJson<AnthropicCompatibleResponse>(
    anthropicMessagesUrl(config.baseURL),
    timeoutMs,
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
      max_tokens: maxOutputTokens,
      temperature: 0.3,
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

async function generateWithOpenAIProtocol(
  config: ProviderConfig,
  prompt: { system: string; user: string },
  timeoutMs: number,
  maxOutputTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    stream: false,
  };
  applyOpenAIGenerationParams(body, config.model, maxOutputTokens, 0.3);

  const response = await postJson<OpenAICompatibleResponse>(
    chatCompletionsUrl(config.baseURL),
    timeoutMs,
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
    stream: false,
  };
  applyOpenAIGenerationParams(body, config.model, request.maxOutputTokens, 0.2);

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

function validateProviderConfig(config: ProviderConfig): void {
  if (!config.model) {
    throw new Error(`${config.title} model is not configured. Choose Fast/Pro or set a custom model in Preferences.`);
  }

  if (!config.baseURL) {
    throw new Error(`${config.title} base URL is not configured.`);
  }

  try {
    const url = new URL(config.baseURL);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error(`${config.title} base URL is invalid: ${config.baseURL}`);
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
  return content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
}

/**
 * OpenAI reasoning models (o-series, GPT-5 family) reject `max_tokens` and any
 * non-default `temperature` with a 400. They use `max_completion_tokens`
 * instead and only accept the default temperature.
 */
function isReasoningModel(model: string): boolean {
  return /^(o\d|gpt-5)/i.test(model.trim());
}

function applyOpenAIGenerationParams(
  body: Record<string, unknown>,
  model: string,
  maxOutputTokens: number,
  temperature: number,
): void {
  if (isReasoningModel(model)) {
    body.max_completion_tokens = maxOutputTokens;
    return;
  }

  body.max_tokens = maxOutputTokens;
  body.temperature = temperature;
}

/**
 * Turn an opaque provider rejection into an actionable message. The default
 * Fast/Pro model catalog can drift ahead of what a provider/key actually
 * serves; when that happens the user needs a clear next step instead of a
 * raw `model_not_found` 400.
 */
function refineProviderError(error: unknown, config: ProviderConfig): Error {
  if (error instanceof MissingAPIKeyError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (isModelNotFoundError(message)) {
    return new Error(
      `${config.title} rejected model "${config.model}" — it may not exist or your key lacks access. ` +
        `Switch the Model tier to Custom (⌘M) or set a valid ${config.title} model in Extension Preferences.`,
    );
  }

  return error instanceof Error ? error : new Error(message);
}

function isModelNotFoundError(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.includes("model")) {
    return false;
  }

  return /(not found|not exist|no such model|invalid model|unknown model|unsupported model|model_not_found|not available|do not have access|no access|cannot be found|is not supported)/.test(
    lower,
  );
}
