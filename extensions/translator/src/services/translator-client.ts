export type ProviderErrorKind =
  | "network"
  | "timeout"
  | "rate_limit"
  | "server_error"
  | "auth"
  | "bad_request"
  | "other";

export class TranslationProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly statusCode?: number;

  constructor(message: string, kind: ProviderErrorKind, statusCode?: number) {
    super(message);
    this.name = "TranslationProviderError";
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

export function isRecoverableProviderError(error: unknown): boolean {
  if (!(error instanceof TranslationProviderError)) {
    return false;
  }

  return (
    error.kind === "network" ||
    error.kind === "timeout" ||
    error.kind === "rate_limit" ||
    error.kind === "server_error"
  );
}

export interface OpenAICompatibleConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  enableStreaming: boolean;
  customHeaders: Record<string, string>;
}

export interface TranslationRequest {
  systemPrompt: string;
  userPrompt: string;
}

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface OpenAICompatibleStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
}

const TRANSLATION_TEMPERATURE = 0;
const EVENT_STREAM_CONTENT_TYPE = "text/event-stream";

function buildHeaders(config: OpenAICompatibleConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    ...config.customHeaders,
  };
}

function buildEndpoint(apiBaseUrl: string): string {
  return `${apiBaseUrl}/chat/completions`;
}

function classifyHttpError(statusCode: number): ProviderErrorKind {
  if (statusCode === 401 || statusCode === 403) {
    return "auth";
  }

  if (statusCode === 429) {
    return "rate_limit";
  }

  if (statusCode >= 500) {
    return "server_error";
  }

  if (statusCode >= 400) {
    return "bad_request";
  }

  return "other";
}

function buildHttpError(
  response: Response,
  payload: OpenAICompatibleResponse,
): TranslationProviderError {
  const fallbackMessage = `API request failed with status ${response.status}.`;
  const message = payload.error?.message?.trim() || fallbackMessage;
  return new TranslationProviderError(
    message,
    classifyHttpError(response.status),
    response.status,
  );
}

function readTranslation(payload: OpenAICompatibleResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new TranslationProviderError(
      "API response does not contain translated content.",
      "other",
    );
  }

  return content.trim();
}

async function parseResponsePayload(
  response: Response,
): Promise<OpenAICompatibleResponse> {
  try {
    return (await response.json()) as OpenAICompatibleResponse;
  } catch {
    throw new TranslationProviderError(
      "API response is not valid JSON.",
      "other",
    );
  }
}

function createInactivityTimer(timeoutMs: number) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const touch = () => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => controller.abort(), timeoutMs);
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  touch();
  return { signal: controller.signal, touch, clear };
}

function parseStreamingDelta(dataLine: string): string {
  if (dataLine === "[DONE]") {
    return "";
  }

  let chunk: OpenAICompatibleStreamChunk;
  try {
    chunk = JSON.parse(dataLine) as OpenAICompatibleStreamChunk;
  } catch {
    throw new TranslationProviderError(
      "Invalid streaming chunk from API.",
      "other",
    );
  }

  const deltaContent = chunk.choices?.[0]?.delta?.content;
  if (typeof deltaContent === "string") {
    return deltaContent;
  }

  if (Array.isArray(deltaContent)) {
    return deltaContent.map((item) => item?.text ?? "").join("");
  }

  return "";
}

function consumeSSEBuffer(buffer: string): { lines: string[]; rest: string } {
  const normalized = buffer.replaceAll("\r", "");
  const parts = normalized.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts, rest };
}

function readDataLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());
}

function parseStreamingTranslation(translatedText: string): string {
  if (!translatedText.trim()) {
    throw new TranslationProviderError(
      "Streaming response does not contain translated content.",
      "other",
    );
  }

  return translatedText.trim();
}

async function parseNonStreamingResponse(response: Response): Promise<string> {
  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    throw buildHttpError(response, payload);
  }

  return readTranslation(payload);
}

async function parseStreamingResponse(
  response: Response,
  touchTimeout: () => void,
): Promise<string> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes(EVENT_STREAM_CONTENT_TYPE)) {
    return parseNonStreamingResponse(response);
  }

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw buildHttpError(response, payload);
  }

  if (!response.body) {
    throw new TranslationProviderError(
      "Streaming response body is empty.",
      "other",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let translatedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    touchTimeout();
    buffer += decoder.decode(value, { stream: true });
    const { lines, rest } = consumeSSEBuffer(buffer);
    buffer = rest;

    for (const dataLine of readDataLines(lines)) {
      translatedText += parseStreamingDelta(dataLine);
    }
  }

  for (const dataLine of readDataLines([buffer])) {
    translatedText += parseStreamingDelta(dataLine);
  }

  return parseStreamingTranslation(translatedText);
}

function buildRequestPayload(
  config: OpenAICompatibleConfig,
  request: TranslationRequest,
): Record<string, unknown> {
  return {
    model: config.model,
    temperature: TRANSLATION_TEMPERATURE,
    stream: config.enableStreaming,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
  };
}

function wrapUnknownError(error: unknown): TranslationProviderError {
  if (error instanceof TranslationProviderError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new TranslationProviderError("Request timeout.", "timeout");
  }

  if (error instanceof TypeError) {
    return new TranslationProviderError(
      error.message || "Network request failed.",
      "network",
    );
  }

  if (error instanceof Error) {
    return new TranslationProviderError(error.message, "other");
  }

  return new TranslationProviderError("Unknown provider error.", "other");
}

export async function translateWithOpenAICompatibleAPI(
  config: OpenAICompatibleConfig,
  request: TranslationRequest,
): Promise<string> {
  const timeout = createInactivityTimer(config.timeoutMs);

  try {
    const response = await fetch(buildEndpoint(config.apiBaseUrl), {
      method: "POST",
      headers: buildHeaders(config),
      signal: timeout.signal,
      body: JSON.stringify(buildRequestPayload(config, request)),
    });

    return config.enableStreaming
      ? await parseStreamingResponse(response, timeout.touch)
      : await parseNonStreamingResponse(response);
  } catch (error) {
    throw wrapUnknownError(error);
  } finally {
    timeout.clear();
  }
}
