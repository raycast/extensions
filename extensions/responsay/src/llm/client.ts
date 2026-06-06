export interface ChatConfig {
  baseURL: string; // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string;
  apiProtocol?: "openai" | "anthropic";
  extraBody?: Record<string, unknown>; // provider-specific extra body fields (e.g. Qwen enable_thinking)
  /** Header that carries the API key. Default sends `Authorization: Bearer <key>`;
   * set e.g. "api-key" to send the raw key under that header (MiMo). */
  authHeader?: string;
}

export class ChatError extends Error {}

const TIMEOUT_MS = 60_000;

export async function chatJSON(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  return chatOpenAICompatible(cfg, system, user, fetchImpl, {
    jsonFormat: true,
  });
}

export async function chatText(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  return chatOpenAICompatible(cfg, system, user, fetchImpl, {
    jsonFormat: false,
  });
}

async function chatOpenAICompatible(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch,
  options: { jsonFormat: boolean },
): Promise<string> {
  if (cfg.apiProtocol === "anthropic") {
    return chatAnthropicJSON(cfg, system, user, fetchImpl);
  }

  const authHeaders: Record<string, string> = cfg.authHeader
    ? { [cfg.authHeader]: cfg.apiKey }
    : { Authorization: `Bearer ${cfg.apiKey}` };
  const request = (useJsonFormat: boolean, includeTemperature: boolean) => {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Keep analysis deterministic. Omitted on retry for models that only
      // accept the default temperature (GPT-5 / o-series reasoning models).
      ...(includeTemperature ? { temperature: 0 } : {}),
      ...(cfg.extraBody ?? {}),
    };
    if (options.jsonFormat && useJsonFormat) {
      body.response_format = { type: "json_object" };
    }
    return fetchImpl(chatCompletionsUrl(cfg.baseURL), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  };

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await request(options.jsonFormat, true);
    if (res.status === 400) {
      // Retry once. Some models/endpoints reject response_format json_object;
      // GPT-5 / o-series reasoning models reject a non-default temperature
      // (OpenAI's guidance is to omit it). Drop temperature only when the error
      // names it, so Qwen/MiMo/Gemini keep temperature: 0.
      const errBody = await res.text().catch(() => "");
      const temperatureRejected =
        /temperature/i.test(errBody) &&
        /(does not support|only the default|unsupported value)/i.test(errBody);
      res = await request(false, !temperatureRejected);
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ChatError(
        `Request to the model timed out after ${TIMEOUT_MS / 1000}s. Check your network and that the provider's base URL and API key are correct.`,
      );
    }
    throw new ChatError(
      `Network error calling the model: ${String(err).slice(0, 150)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChatError(`Chat API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string")
    throw new ChatError("Chat response had no text content");
  return content;
}

async function chatAnthropicJSON(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetchImpl(anthropicMessagesUrl(cfg.baseURL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "x-api-key": cfg.apiKey,
        "api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        system,
        messages: [{ role: "user", content: user }],
        max_tokens: 8192,
        temperature: 0,
        stream: false,
        ...(cfg.extraBody ?? {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ChatError(
        `Request to the model timed out after ${TIMEOUT_MS / 1000}s. Check your network and that the provider's base URL and API key are correct.`,
      );
    }
    throw new ChatError(
      `Network error calling the model: ${String(err).slice(0, 150)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChatError(`Chat API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type?: string; text?: unknown }[];
  };
  const content = data.content
    ?.filter((part) => part.type === "text" || typeof part.text === "string")
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  if (!content) throw new ChatError("Chat response had no text content");
  return content;
}

function chatCompletionsUrl(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
}

function anthropicMessagesUrl(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1/messages")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
}
