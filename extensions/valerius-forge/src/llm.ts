// Multi-provider LLM client (BYOK) — Raycast/browser-compatible.

export type Provider =
  | "openrouter"
  | "xai"
  | "anthropic"
  | "openai"
  | "google"
  | "local";

export interface LLMConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  /** Base URL — only used for `local` (Ollama / LM Studio / any OpenAI-compatible local server). */
  baseUrl?: string;
}

export const DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1";

interface StreamOpts {
  config: LLMConfig;
  systemPrompt: string;
  userPrompt: string;
  onToken: (chunk: string) => void;
  signal?: AbortSignal;
}

class LLMError extends Error {
  status?: number;
  constructor(msg: string, status?: number) {
    super(msg);
    this.name = "LLMError";
    this.status = status;
  }
}

function friendlyStatus(status: number): string {
  if (status === 401 || status === 403)
    return "Invalid or unauthorized API key.";
  if (status === 404) return "Model not found for this provider.";
  if (status === 429) return "Rate limited — slow down or check your plan.";
  if (status >= 500) return "Provider is having issues right now.";
  return `Request failed (HTTP ${status}).`;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 240);
  } catch {
    return "";
  }
}

export async function streamForge(
  opts: StreamOpts,
): Promise<{ fullText: string }> {
  const { config } = opts;
  if (config.provider === "anthropic") return streamAnthropic(opts);
  return streamOpenAICompatible(opts);
}

function endpointFor(config: LLMConfig): string {
  switch (config.provider) {
    case "openrouter":
      return "https://openrouter.ai/api/v1/chat/completions";
    case "xai":
      return "https://api.x.ai/v1/chat/completions";
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "local": {
      const base = (config.baseUrl?.trim() || DEFAULT_LOCAL_BASE_URL).replace(
        /\/+$/,
        "",
      );
      return `${base}/chat/completions`;
    }
  }
}

function headersFor(
  provider: Provider,
  apiKey: string,
): Record<string, string> {
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "anthropic") {
    base["x-api-key"] = apiKey;
    base["anthropic-version"] = "2023-06-01";
    base["anthropic-dangerous-direct-browser-access"] = "true";
    return base;
  }
  if (provider === "local") {
    if (apiKey.trim()) base["Authorization"] = `Bearer ${apiKey}`;
    return base;
  }
  base["Authorization"] = `Bearer ${apiKey}`;
  if (provider === "openrouter") {
    base["HTTP-Referer"] = "https://www.raycast.com";
    base["X-Title"] = "Valerius Forge";
  }
  return base;
}

async function streamOpenAICompatible(
  opts: StreamOpts,
): Promise<{ fullText: string }> {
  const { config, systemPrompt, userPrompt, onToken, signal } = opts;
  const res = await fetch(endpointFor(config), {
    method: "POST",
    headers: headersFor(config.provider, config.apiKey),
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await readErrorBody(res);
    throw new LLMError(
      `${friendlyStatus(res.status)}${body ? ` — ${body}` : ""}`,
      res.status,
    );
  }
  return readSSE(res, onToken, (data) => {
    try {
      const json = JSON.parse(data);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") return delta;
      const msg = json?.choices?.[0]?.message?.content;
      if (typeof msg === "string") return msg;
    } catch {
      // ignore non-JSON lines
    }
    return "";
  });
}

async function streamAnthropic(
  opts: StreamOpts,
): Promise<{ fullText: string }> {
  const { config, systemPrompt, userPrompt, onToken, signal } = opts;
  const res = await fetch(
    endpointFor({ provider: "anthropic", apiKey: "", model: "" }),
    {
      method: "POST",
      headers: headersFor("anthropic", config.apiKey),
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal,
    },
  );
  if (!res.ok || !res.body) {
    const body = await readErrorBody(res);
    throw new LLMError(
      `${friendlyStatus(res.status)}${body ? ` — ${body}` : ""}`,
      res.status,
    );
  }
  return readSSE(res, onToken, (data) => {
    try {
      const json = JSON.parse(data);
      if (
        json.type === "content_block_delta" &&
        json.delta?.type === "text_delta"
      ) {
        return json.delta.text ?? "";
      }
    } catch {
      // ignore
    }
    return "";
  });
}

async function readSSE(
  res: Response,
  onToken: (chunk: string) => void,
  parseData: (data: string) => string,
): Promise<{ fullText: string }> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    const value = result.value;
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const piece = parseData(data);
      if (piece) {
        full += piece;
        onToken(piece);
      }
    }
  }
  return { fullText: full };
}
