import { AI, LocalStorage } from "@raycast/api";
import http from "http";
import https from "https";

export interface Model {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderInfo {
  value: string;
  title: string;
  /** Local providers talk to a server on the user's own machine. */
  local: boolean;
  /** Whether an API key must be supplied before the provider can be used. */
  requiresApiKey: boolean;
  /** Default endpoint for local providers, editable by the user. */
  defaultBaseUrl?: string;
  docsUrl: string;
  hint?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    value: "raycast",
    title: "Raycast AI (Default)",
    local: false,
    requiresApiKey: false,
    docsUrl: "https://raycast.com",
  },
  {
    value: "openai",
    title: "OpenAI",
    local: false,
    requiresApiKey: true,
    docsUrl: "https://platform.openai.com/docs/models",
  },
  {
    value: "anthropic",
    title: "Anthropic",
    local: false,
    requiresApiKey: true,
    docsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
  },
  {
    value: "gemini",
    title: "Gemini",
    local: false,
    requiresApiKey: true,
    docsUrl: "https://ai.google.dev/gemini-api/docs/models/gemini",
  },
  {
    value: "openrouter",
    title: "OpenRouter",
    local: false,
    requiresApiKey: true,
    docsUrl: "https://openrouter.ai/models",
  },
  {
    value: "lmstudio",
    title: "LM Studio (Local)",
    local: true,
    requiresApiKey: false,
    defaultBaseUrl: "http://localhost:1234",
    docsUrl: "https://lmstudio.ai/docs/app/api/endpoints/rest",
    hint: "Start the server in LM Studio: Developer tab -> Status: Running (default port 1234).",
  },
  {
    value: "ollama",
    title: "Ollama (Local)",
    local: true,
    requiresApiKey: false,
    defaultBaseUrl: "http://localhost:11434",
    docsUrl: "https://github.com/ollama/ollama/blob/main/docs/api.md",
    hint: "Make sure Ollama is running (`ollama serve`) and you have pulled at least one model.",
  },
];

export function getProviderInfo(provider: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.value === provider);
}

export function isLocalProvider(provider: string): boolean {
  return getProviderInfo(provider)?.local ?? false;
}

export function requiresApiKey(provider: string): boolean {
  return getProviderInfo(provider)?.requiresApiKey ?? false;
}

export function defaultBaseUrl(provider: string): string {
  return getProviderInfo(provider)?.defaultBaseUrl ?? "";
}

/**
 * Raised when the extension is misconfigured (missing key/model, unreachable
 * local server). The action runner turns these into a toast that links straight
 * to the "Configure AI Model" command.
 */
export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

export const STORAGE_KEYS = {
  provider: "configured_provider",
  apiKey: (p: string) => `api_key_${p}`,
  model: (p: string) => `selected_model_${p}`,
  baseUrl: (p: string) => `base_url_${p}`,
};

/** Remote calls get a short leash; local models may need to warm up first. */
const REMOTE_TIMEOUT_MS = 60_000;
const LOCAL_TIMEOUT_MS = 180_000;
const MAX_TOKENS = 4096;

interface ModelEntry {
  id: string;
  name?: string;
  display_name?: string;
  displayName?: string;
}

interface GeminiModel {
  name: string;
  displayName: string;
}

interface LMStudioModel {
  id: string;
  type?: string;
  arch?: string;
  quantization?: string;
  state?: string;
  max_context_length?: number;
}

interface OllamaModel {
  name: string;
  model?: string;
  details?: { parameter_size?: string; quantization_level?: string };
}

/**
 * Accepts anything the user is likely to paste ("localhost:1234",
 * "http://127.0.0.1:1234/v1/", "http://host:11434/api") and reduces it to a
 * bare origin that the per-provider paths below can be appended to.
 */
export function normalizeBaseUrl(raw: string, provider: string): string {
  let value = (raw || "").trim();
  if (!value) return defaultBaseUrl(provider);
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  try {
    const url = new URL(value);
    const path = url.pathname
      .replace(/\/+$/, "")
      .replace(/\/(v1|api(\/v\d+)?)$/i, "");
    return `${url.origin}${path}`;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export class LLMService {
  public static async getProvider(): Promise<string> {
    const saved = await LocalStorage.getItem<string>(STORAGE_KEYS.provider);
    return saved || "raycast";
  }

  public static async getApiKey(provider: string): Promise<string> {
    return (
      (await LocalStorage.getItem<string>(STORAGE_KEYS.apiKey(provider))) || ""
    );
  }

  public static async getSelectedModel(provider?: string): Promise<string> {
    const p = provider ?? (await this.getProvider());
    return (await LocalStorage.getItem<string>(STORAGE_KEYS.model(p))) || "";
  }

  public static async getBaseUrl(provider: string): Promise<string> {
    const saved = await LocalStorage.getItem<string>(
      STORAGE_KEYS.baseUrl(provider),
    );
    return normalizeBaseUrl(saved || "", provider);
  }

  // ---------------------------------------------------------------- models

  public static async fetchModelsWithKey(
    provider: string,
    key: string,
    baseUrl?: string,
  ): Promise<Model[]> {
    const base = normalizeBaseUrl(baseUrl || "", provider);

    if (provider === "openai") {
      const oai = await this.request(
        "https://api.openai.com/v1/models",
        "GET",
        {
          Authorization: `Bearer ${key}`,
        },
      );
      return oai.data
        .map((m: ModelEntry) => ({ id: m.id, name: m.id }))
        .sort((a: Model, b: Model) => a.id.localeCompare(b.id));
    }

    if (provider === "anthropic") {
      const ant = await this.request(
        "https://api.anthropic.com/v1/models",
        "GET",
        {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      );
      return ant.data
        .map((m: ModelEntry) => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a: Model, b: Model) => a.id.localeCompare(b.id));
    }

    if (provider === "gemini") {
      const gem = await this.request(
        "https://generativelanguage.googleapis.com/v1beta/models",
        "GET",
        { "x-goog-api-key": key },
      );
      return gem.models
        .filter((m: GeminiModel) => m.name.includes("gemini"))
        .map((m: GeminiModel) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName,
        }));
    }

    if (provider === "openrouter") {
      const or = await this.request(
        "https://openrouter.ai/api/v1/models",
        "GET",
        {},
      );
      return or.data.map((m: ModelEntry) => ({
        id: m.id,
        name: m.name || m.id,
      }));
    }

    if (provider === "lmstudio") return this.fetchLMStudioModels(base, key);
    if (provider === "ollama") return this.fetchOllamaModels(base, key);

    return [];
  }

  /**
   * Prefers LM Studio's native /api/v0/models, which reports model type and
   * load state, and falls back to the OpenAI-compatible listing on older builds.
   */
  private static async fetchLMStudioModels(
    base: string,
    key: string,
  ): Promise<Model[]> {
    const headers = this.localHeaders(key);
    try {
      const res = await this.request(
        `${base}/api/v0/models`,
        "GET",
        headers,
        null,
        LOCAL_TIMEOUT_MS,
      );
      const entries: LMStudioModel[] = res.data || [];
      return entries
        .filter((m) => m.type !== "embeddings")
        .map((m) => ({
          id: m.id,
          name: m.state === "loaded" ? `${m.id} (loaded)` : m.id,
          description:
            [m.arch, m.quantization].filter(Boolean).join(" · ") || undefined,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    } catch {
      const res = await this.request(
        `${base}/v1/models`,
        "GET",
        headers,
        null,
        LOCAL_TIMEOUT_MS,
      );
      const entries: ModelEntry[] = res.data || [];
      return entries
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }
  }

  private static async fetchOllamaModels(
    base: string,
    key: string,
  ): Promise<Model[]> {
    const res = await this.request(
      `${base}/api/tags`,
      "GET",
      this.localHeaders(key),
      null,
      LOCAL_TIMEOUT_MS,
    );
    const entries: OllamaModel[] = res.models || [];
    return entries
      .map((m) => ({
        id: m.model || m.name,
        name: m.name,
        description:
          [m.details?.parameter_size, m.details?.quantization_level]
            .filter(Boolean)
            .join(" · ") || undefined,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  // ------------------------------------------------------------ completion

  public static async askAI(prompt: string): Promise<string> {
    const provider = await this.getProvider();

    if (provider === "raycast") return this.callRaycastAI(prompt);

    const model = await this.getSelectedModel(provider);
    const apiKey = await this.getApiKey(provider);

    if (requiresApiKey(provider) && !apiKey) {
      throw new LLMConfigError(
        `API key required for ${provider}. Set it in "Configure AI Model".`,
      );
    }
    if (!model) {
      throw new LLMConfigError(
        `No model selected for ${provider}. Pick one in "Configure AI Model".`,
      );
    }

    switch (provider) {
      case "openai":
        return this.callOpenAICompatible(
          "https://api.openai.com/v1/chat/completions",
          { Authorization: `Bearer ${apiKey}` },
          model,
          prompt,
          REMOTE_TIMEOUT_MS,
        );
      case "anthropic":
        return this.callAnthropic(apiKey, model, prompt);
      case "gemini":
        return this.callGemini(apiKey, model, prompt);
      case "openrouter":
        return this.callOpenAICompatible(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://raycast.com",
            "X-Title": "Raycast Stealth AI",
          },
          model,
          prompt,
          REMOTE_TIMEOUT_MS,
        );
      case "lmstudio":
        return this.callOpenAICompatible(
          `${await this.getBaseUrl(provider)}/v1/chat/completions`,
          this.localHeaders(apiKey),
          model,
          prompt,
          LOCAL_TIMEOUT_MS,
        );
      case "ollama":
        return this.callOllama(
          await this.getBaseUrl(provider),
          apiKey,
          model,
          prompt,
        );
      default:
        throw new LLMConfigError(`Unknown provider: ${provider}`);
    }
  }

  private static async callRaycastAI(prompt: string): Promise<string> {
    try {
      return await AI.ask(prompt);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("Model is not supported")) {
        throw new LLMConfigError(
          'Raycast AI is not available on this account. Pick another provider in "Configure AI Model".',
        );
      }
      throw e;
    }
  }

  /** OpenAI, OpenRouter and LM Studio all speak the same chat-completions dialect. */
  private static async callOpenAICompatible(
    url: string,
    headers: Record<string, string>,
    model: string,
    prompt: string,
    timeoutMs: number,
  ): Promise<string> {
    const response = await this.request(
      url,
      "POST",
      { "Content-Type": "application/json", ...headers },
      {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      timeoutMs,
    );
    return response.choices?.[0]?.message?.content?.trim() || "";
  }

  private static async callAnthropic(
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const response = await this.request(
      "https://api.anthropic.com/v1/messages",
      "POST",
      {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: MAX_TOKENS,
      },
      REMOTE_TIMEOUT_MS,
    );
    return response.content?.[0]?.text?.trim() || "";
  }

  private static async callGemini(
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const response = await this.request(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      "POST",
      { "Content-Type": "application/json", "x-goog-api-key": key },
      { contents: [{ parts: [{ text: prompt }] }] },
      REMOTE_TIMEOUT_MS,
    );
    return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  private static async callOllama(
    base: string,
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const response = await this.request(
      `${base}/api/chat`,
      "POST",
      { "Content-Type": "application/json", ...this.localHeaders(key) },
      {
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0.7 },
      },
      LOCAL_TIMEOUT_MS,
    );
    return response.message?.content?.trim() || "";
  }

  /** Local servers usually need no auth, but both accept a bearer token when secured. */
  private static localHeaders(key: string): Record<string, string> {
    return key ? { Authorization: `Bearer ${key}` } : {};
  }

  // --------------------------------------------------------------- transport

  private static request(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | null = null,
    timeoutMs: number = REMOTE_TIMEOUT_MS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let target: URL;
      try {
        target = new URL(url);
      } catch {
        reject(new LLMConfigError(`Invalid endpoint URL: ${url}`));
        return;
      }

      // Local providers are served over plain HTTP, so pick the module per scheme.
      const transport = target.protocol === "http:" ? http : https;
      const payload = body ? JSON.stringify(body) : null;

      const req = transport.request(
        target,
        {
          method,
          headers: {
            Accept: "application/json",
            ...headers,
            ...(payload
              ? { "Content-Length": Buffer.byteLength(payload) }
              : {}),
          },
        },
        (res) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            const status = res.statusCode ?? 0;
            if (status >= 200 && status < 300) {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch {
                reject(
                  new Error(
                    `Could not parse response from ${target.host}: ${data.slice(0, 200)}`,
                  ),
                );
              }
            } else {
              reject(this.httpError(status, data, target));
            }
          });
        },
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy(
          new Error(
            `Request to ${target.host} timed out after ${timeoutMs / 1000}s`,
          ),
        );
      });
      req.on("error", (e) => reject(this.networkError(e, target)));
      if (payload) req.write(payload);
      req.end();
    });
  }

  private static httpError(status: number, data: string, target: URL): Error {
    const detail = this.extractErrorMessage(data);
    if (status === 401 || status === 403) {
      return new LLMConfigError(
        `Authentication failed (${status}). Check your API key. ${detail}`.trim(),
      );
    }
    if (status === 404 && this.isLoopback(target)) {
      return new LLMConfigError(
        `${target.host} returned 404 for ${target.pathname}. Check the base URL and that the model is available.`,
      );
    }
    return new Error(
      `Request failed (${status}): ${detail || data.slice(0, 200)}`,
    );
  }

  private static networkError(e: NodeJS.ErrnoException, target: URL): Error {
    if (
      e.code === "ECONNREFUSED" ||
      e.code === "ECONNRESET" ||
      e.code === "EHOSTUNREACH"
    ) {
      return new LLMConfigError(
        `Cannot reach the local server at ${target.origin}. Make sure it is running and the base URL is correct.`,
      );
    }
    return e;
  }

  private static extractErrorMessage(data: string): string {
    try {
      const parsed = JSON.parse(data);
      return parsed?.error?.message || parsed?.error || parsed?.message || "";
    } catch {
      return "";
    }
  }

  private static isLoopback(target: URL): boolean {
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
      target.hostname,
    );
  }
}
