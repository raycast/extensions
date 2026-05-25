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
      return await generateWithAnthropicProtocol(config, prompt, timeoutMs, maxOutputTokens, options);
    }
    return await generateWithOpenAIProtocol(config, prompt, timeoutMs, maxOutputTokens, options);
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
  applyGeminiResponseFormat(generationConfig, options);

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
  options: GenerationOptions = {},
): Promise<string> {
  const structuredPrompt = applyStructuredPromptOptions(prompt, options);
  const response = await postJson<AnthropicCompatibleResponse>(
    anthropicMessagesUrl(config.baseURL),
    timeoutMs,
    anthropicCompatibleHeaders(config.apiKey),
    withDisabledThinking({
      model: config.model,
      system: structuredPrompt.system,
      messages: [{ role: "user", content: structuredPrompt.user }],
      max_tokens: maxOutputTokens,
      temperature: 0.3,
      stream: false,
    }),
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
  options: GenerationOptions = {},
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
  applyOpenAIResponseFormat(body, options);

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
    anthropicCompatibleHeaders(config.apiKey),
    withDisabledThinking({
      model: config.model,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      max_tokens: request.maxOutputTokens,
      temperature: 0.2,
      stream: false,
    }),
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
  if (trimmed.endsWith("/v1/messages")) return trimmed;
  // Tolerate base URLs that already include the Anthropic version segment
  // (e.g. https://api.kimi.com/coding/v1) so we don't accidentally produce
  // a doubled .../v1/v1/messages path.
  if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
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
    // Translation is latency-sensitive and does not benefit from reasoning
    // tokens. `minimal` (the lowest GPT-5.x setting that still works on every
    // reasoning model) cuts first-token latency and per-call cost without
    // changing output quality on short prompts.
    body.reasoning_effort = "minimal";
    return;
  }

  body.max_tokens = maxOutputTokens;
  body.temperature = temperature;
}

/**
 * Modern OpenAI structured outputs use `response_format.type: "json_schema"`
 * with `strict: true` so the model is constrained at decode time. Bare
 * `json_object` mode only guarantees valid JSON, not adherence to the schema,
 * so we always prefer json_schema when a schema is supplied.
 */
function applyOpenAIResponseFormat(body: Record<string, unknown>, options: GenerationOptions): void {
  if (options.responseJsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "structured_response",
        strict: true,
        schema: toOpenAIJsonSchema(options.responseJsonSchema),
      },
    };
    return;
  }

  if (options.responseMimeType === "application/json") {
    body.response_format = { type: "json_object" };
  }
}

/**
 * OpenAI's strict JSON Schema rejects Gemini-specific keys like
 * `propertyOrdering` with `Unknown parameter`. Strip them so the same schema
 * object works for both providers.
 */
function toOpenAIJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  stripGeminiOnlyKeys(clone);
  return clone;
}

function stripGeminiOnlyKeys(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(stripGeminiOnlyKeys);
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }
  const record = node as Record<string, unknown>;
  delete record.propertyOrdering;
  for (const value of Object.values(record)) {
    stripGeminiOnlyKeys(value);
  }
}

/**
 * Gemini moved structured output from `responseMimeType` + `responseJsonSchema`
 * to `responseFormat.text.{mimeType,schema}` (current docs as of 2026). We
 * write the new shape only — every shipping Gemini 2.5+/3.x model accepts it.
 */
function applyGeminiResponseFormat(generationConfig: Record<string, unknown>, options: GenerationOptions): void {
  const mimeType = options.responseMimeType ?? (options.responseJsonSchema ? "application/json" : undefined);
  if (!mimeType && !options.responseJsonSchema) {
    return;
  }

  const text: Record<string, unknown> = {};
  if (mimeType) text.mimeType = mimeType;
  if (options.responseJsonSchema) text.schema = options.responseJsonSchema;
  generationConfig.responseFormat = { text };
}

function anthropicCompatibleHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
    "api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };
}

/**
 * DeepSeek v4 and MiMo v2.5 default to `thinking: enabled`, which adds
 * first-token latency and silently ignores `temperature`. Translation is
 * latency-sensitive and benefits from temperature control, so we explicitly
 * disable thinking for every Anthropic-compatible request. Providers that
 * don't recognize the key (vanilla Anthropic) ignore it.
 */
function withDisabledThinking<T extends Record<string, unknown>>(body: T): T & { thinking: { type: "disabled" } } {
  return { ...body, thinking: { type: "disabled" } };
}

function applyStructuredPromptOptions(
  prompt: { system: string; user: string },
  options: GenerationOptions,
): { system: string; user: string } {
  if (!options.responseJsonSchema && options.responseMimeType !== "application/json") {
    return prompt;
  }

  const constraints = ["Return only a valid JSON object. Do not wrap it in Markdown or add commentary."];
  if (options.responseJsonSchema) {
    constraints.push(`JSON schema: ${JSON.stringify(options.responseJsonSchema)}`);
  }

  return {
    system: `${prompt.system}\n\nStructured output requirements:\n${constraints.join("\n")}`,
    user: prompt.user,
  };
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

  return /(not found|not exist|no such model|invalid model|unknown model|unsupported model|not supported model|model_not_found|not available|do not have access|no access|cannot be found|is not supported)/.test(
    lower,
  );
}
