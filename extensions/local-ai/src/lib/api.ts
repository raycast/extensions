import { getPreferenceValues } from "@raycast/api";
import { readFileSync } from "fs";
import type {
  ProviderConfig,
  ProviderType,
  Model,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Tool,
} from "./types";
import { getProviderUrl } from "./onboarding";

export const DEFAULT_URLS: Record<ProviderType, string> = {
  ollama: "http://localhost:11434",
  lmstudio: "http://localhost:1234",
  llamacpp: "http://localhost:8080",
  custom: "",
};

export const PROVIDER_NAMES: Record<ProviderType, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  llamacpp: "llama.cpp",
  custom: "Custom server",
};

/**
 * Returns the default base URL for a given provider type.
 * Priority: per-provider stored URL > global serverUrl preference > built-in default.
 */
export async function getDefaultBaseUrl(
  provider: ProviderType,
): Promise<string> {
  const stored = await getProviderUrl(provider);
  if (stored) return stored;
  const prefs = getPreferenceValues<Preferences>();
  const custom = prefs.serverUrl?.trim();
  if (custom) return custom;
  return DEFAULT_URLS[provider];
}

/**
 * Build the provider configuration.
 * Async because it reads per-provider URLs from LocalStorage.
 */
export async function getProviderConfig(): Promise<ProviderConfig> {
  const prefs = getPreferenceValues<Preferences>();

  const providerType = prefs.provider as ProviderType;
  const baseUrl = await getDefaultBaseUrl(providerType);

  return {
    type: providerType,
    baseUrl,
    defaultModel: prefs.defaultModel?.trim() || "",
    temperature: parseFloat(prefs.temperature) || 0.7,
    maxTokens: parseInt(prefs.maxTokens, 10) || 2048,
    systemPrompt: prefs.systemPrompt?.trim() || "",
    streamResponses: prefs.streamResponses,
  };
}

/** Translate a fetch error into a user-friendly message with provider context. */
function translateFetchError(err: unknown, config: ProviderConfig): Error {
  const name = PROVIDER_NAMES[config.type];

  // Timeout (AbortSignal.timeout throws DOMException with name "TimeoutError")
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return new Error(
      `Server took too long to respond. Check that ${name} is running at ${config.baseUrl}.`,
    );
  }

  // Node timeout errors may also come as AbortError
  if (err instanceof Error && err.name === "AbortError") {
    return new Error(
      `Server took too long to respond. Check that ${name} is running at ${config.baseUrl}.`,
    );
  }

  // Network errors — ECONNREFUSED, ENOTFOUND, etc.
  if (
    err instanceof TypeError ||
    (err instanceof Error && err.message.includes("fetch"))
  ) {
    const cause =
      err instanceof Error
        ? (err as Error & { cause?: Error }).cause
        : undefined;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? (cause as { code?: string }).code
        : undefined;

    if (
      code === "ECONNREFUSED" ||
      (err instanceof Error && err.message.includes("ECONNREFUSED"))
    ) {
      return new Error(
        `Server not running at ${config.baseUrl}. Start your ${name} server and try again.`,
      );
    }

    return new Error(
      `Cannot connect to ${name} at ${config.baseUrl} — is it running?`,
    );
  }

  // Pass through any other errors
  if (err instanceof Error) {
    return err;
  }
  return new Error(String(err));
}

/** Vision-capable model families in Ollama (presence of these indicates vision support). */
const VISION_FAMILIES = new Set(["clip", "mllama"]);

/**
 * Fetch models with rich metadata from Ollama's native /api/tags endpoint.
 * Falls back to the OpenAI-compatible /v1/models if /api/tags is unavailable.
 */
async function fetchOllamaModels(config: ProviderConfig): Promise<Model[]> {
  const url = `${config.baseUrl}/api/tags`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.status === 404) return fetchModelsGeneric(config);
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const json = (await res.json()) as {
      models: Array<{
        name: string;
        model: string;
        size: number;
        details: {
          format: string;
          family: string;
          families: string[] | null;
          parameter_size: string;
          quantization_level: string;
        };
      }>;
    };

    return (json.models ?? []).map((m) => {
      const families = m.details.families ?? [];
      return {
        id: m.name,
        name: m.name,
        parameterSize: m.details.parameter_size,
        quantizationLevel: m.details.quantization_level,
        family: m.details.family,
        families,
        format: m.details.format,
        diskSize: m.size,
        supportsVision: families.some((f) => VISION_FAMILIES.has(f)),
      };
    });
  } catch (err) {
    // Only fall back for errors suggesting the endpoint doesn't exist
    if (err instanceof TypeError) return fetchModelsGeneric(config);
    throw translateFetchError(err, config);
  }
}

/**
 * Fetch models with rich metadata from LM Studio's native /api/v0/models endpoint.
 * Falls back to the OpenAI-compatible /v1/models if unavailable.
 */
async function fetchLmStudioModels(config: ProviderConfig): Promise<Model[]> {
  const url = `${config.baseUrl}/api/v0/models`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.status === 404) return fetchModelsGeneric(config);
    if (!res.ok) throw new Error(`LM Studio returned ${res.status}`);

    const json = (await res.json()) as {
      data: Array<{
        id: string;
        type?: string;
        publisher?: string;
        arch?: string;
        compatibility_type?: string;
        quantization?: string;
        state?: string;
        max_context_length?: number;
      }>;
    };

    return (json.data ?? []).map((m) => ({
      id: m.id,
      name: m.id,
      family: m.arch,
      quantizationLevel: m.quantization,
      format: m.compatibility_type,
      maxContextLength: m.max_context_length,
      supportsVision: m.type === "vlm",
    }));
  } catch (err) {
    if (err instanceof TypeError) return fetchModelsGeneric(config);
    throw translateFetchError(err, config);
  }
}

/** Generic /v1/models fetch for non-Ollama providers. */
async function fetchModelsGeneric(config: ProviderConfig): Promise<Model[]> {
  const url = `${config.baseUrl}/v1/models`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { data: Model[] };
    return json.data ?? [];
  } catch (err) {
    throw translateFetchError(err, config);
  }
}

export async function fetchModels(config: ProviderConfig): Promise<Model[]> {
  if (config.type === "ollama") {
    return fetchOllamaModels(config);
  }
  if (config.type === "lmstudio") {
    return fetchLmStudioModels(config);
  }
  return fetchModelsGeneric(config);
}

/**
 * Convert ChatMessage[] to the API format, transforming messages with
 * attached images into the OpenAI multimodal content-parts format.
 * Messages without images pass through unchanged.
 */
function prepareMessagesForApi(messages: ChatMessage[]): unknown[] {
  if (!messages.some((m) => m.images?.length)) return messages;

  return messages.map((msg) => {
    if (!msg.images?.length) return msg;

    const parts: unknown[] = [];
    if (msg.content) {
      parts.push({ type: "text", text: msg.content });
    }
    for (const imgPath of msg.images) {
      try {
        const b64 = readFileSync(imgPath).toString("base64");
        parts.push({
          type: "image_url",
          image_url: { url: `data:image/png;base64,${b64}` },
        });
      } catch (err) {
        console.error(`[api] Failed to read image ${imgPath}:`, err);
        parts.push({ type: "text", text: "[Image failed to load]" });
      }
    }
    return { role: msg.role, content: parts.length > 0 ? parts : msg.content };
  });
}

export async function sendChat(
  config: ProviderConfig,
  request: ChatRequest,
): Promise<ChatResponse> {
  const url = `${config.baseUrl}/v1/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        messages: prepareMessagesForApi(request.messages),
        stream: false,
      }),
      signal: AbortSignal.timeout(300_000), // 5 minutes — local LLMs can be slow
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as ChatResponse;
  } catch (err) {
    throw translateFetchError(err, config);
  }
}

export async function sendChatStream(
  config: ProviderConfig,
  request: ChatRequest,
): Promise<ReadableStream> {
  const url = `${config.baseUrl}/v1/chat/completions`;
  try {
    // No timeout on the stream request itself — local LLMs can take minutes.
    // We rely on the caller (or an inactivity check) to abort if needed.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        messages: prepareMessagesForApi(request.messages),
        stream: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }
    if (!res.body) {
      throw new Error(
        "Response body is empty — streaming not supported by server",
      );
    }
    return res.body;
  } catch (err) {
    throw translateFetchError(err, config);
  }
}

/**
 * Send a non-streaming chat request with tools.
 * Used for the tool-calling decision phase (stream: false).
 * 60-second timeout since tool-calling round-trips are expected to be faster.
 */
export async function sendChatWithTools(
  config: ProviderConfig,
  request: ChatRequest,
  tools: Tool[],
): Promise<ChatResponse> {
  const url = `${config.baseUrl}/v1/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        messages: prepareMessagesForApi(request.messages),
        stream: false,
        tools,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as ChatResponse;
  } catch (err) {
    throw translateFetchError(err, config);
  }
}

export async function checkHealth(config: ProviderConfig): Promise<boolean> {
  const url = `${config.baseUrl}/v1/models`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Trim a conversation to avoid exceeding token limits.
 * Keeps the system prompt (if first message is role "system") plus the
 * last `maxMessages` non-system messages.
 */
export function trimMessages(
  messages: ChatMessage[],
  maxMessages = 50,
): ChatMessage[] {
  if (messages.length <= maxMessages) return messages;

  const systemMessages: ChatMessage[] = [];
  const nonSystemMessages: ChatMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(msg);
    } else {
      nonSystemMessages.push(msg);
    }
  }

  // Keep system prompt(s) + last N non-system messages
  const trimmed = nonSystemMessages.slice(-maxMessages);
  return [...systemMessages, ...trimmed];
}
