/**
 * LLM API client for DeepSeek, Kimi, OpenAI, Anthropic, Gemini.
 * Uses OpenAI-compatible chat completions where available; Anthropic uses Messages API.
 */

const SYSTEM_PROMPT = `You are a prompt compiler. The user will give you text in any language (not necessarily English).

Do exactly two things in one response, in this exact Markdown format (no other text before or after):

## English Translation
First, translate the input into clear, natural, professional English. If the input is already in English, refine it for clarity and tone. Preserve intent; avoid literal or awkward phrasing. Output language must always be English.

## Optimized Prompt
Then, rewrite that English into a single LLM-ready prompt: instruction-style, concise, explicit, suitable for pasting into any AI tool. Do not include explanations or meta commentary in the prompt itself. Output only the prompt text under this heading.`;

const REQUEST_TIMEOUT_MS = 45000;

type Provider = "deepseek" | "kimi" | "openai" | "anthropic" | "gemini";

export type LLMConfig = {
  provider?: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  chatPath?: string;
};

export type OutputMode = "both" | "translation" | "prompt";

export type CompileResult = {
  markdown: string;
  translation: string;
  optimizedPrompt: string;
};

function normalizeProvider(provider?: string): Provider {
  if (provider === "kimi" || provider === "openai" || provider === "anthropic" || provider === "gemini") {
    return provider;
  }
  return "deepseek";
}

function providerLabel(provider?: string): string {
  const normalized = normalizeProvider(provider);
  if (normalized === "kimi") return "Kimi";
  if (normalized === "openai") return "OpenAI";
  if (normalized === "anthropic") return "Anthropic";
  if (normalized === "gemini") return "Gemini";
  return "DeepSeek";
}

function toErrorBodyString(body: unknown): string {
  if (typeof body !== "string") return "";
  return body.toLowerCase();
}

export function mapHttpError(provider: string | undefined, status: number, body: string): Error {
  const service = providerLabel(provider);
  const normalizedBody = toErrorBodyString(body);

  if (status === 401) {
    return new Error(
      `Invalid API key (${status}) from ${service}. Check that the key is correct, active, and matches the selected provider in Extension Preferences (⌘,).`
    );
  }

  if (status === 403) {
    return new Error(
      `Access denied by ${service} (${status}). Your key may lack model access or project permissions. Verify account and model access.`
    );
  }

  if (status === 404) {
    return new Error(
      `Endpoint or model not found on ${service} (${status}). Check the selected provider and model ID in Extension Preferences (⌘,).`
    );
  }

  if (status === 408 || status === 504) {
    return new Error(`Request to ${service} timed out (${status}). Try again in a moment.`);
  }

  if (
    status === 429 ||
    normalizedBody.includes("rate limit") ||
    normalizedBody.includes("too many requests") ||
    normalizedBody.includes("quota") ||
    normalizedBody.includes("insufficient_quota")
  ) {
    return new Error(
      `${service} rate limit or quota reached (${status}). Wait and retry, or switch model/provider in Extension Preferences (⌘,).`
    );
  }

  if (status >= 500) {
    return new Error(`${service} is temporarily unavailable (${status}). Try again shortly.`);
  }

  const bodyPart = body ? `: ${body}` : "";
  return new Error(`API error from ${service} (${status})${bodyPart}`);
}

function mapNetworkError(provider: string | undefined, err: unknown): Error {
  if (typeof err === "object" && err !== null && "name" in err && err.name === "AbortError") {
    return new Error(
      `Request timed out after ${Math.floor(REQUEST_TIMEOUT_MS / 1000)}s while contacting ${providerLabel(
        provider
      )}. Try again, shorten the input, or switch model/provider.`
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return new Error(`Network error while contacting ${providerLabel(provider)}: ${message}`);
}

async function fetchWithTimeout(url: string, init: RequestInit, provider?: string): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw mapNetworkError(provider, error);
  }
}

function normalizeModelResponse(raw: string): CompileResult {
  const markdown = raw.replace(/\r\n/g, "\n").trim();
  const translationMatch = markdown.match(/##\s*English Translation\s*([\s\S]*?)(?=##\s*Optimized Prompt|$)/i);
  const promptMatch = markdown.match(/##\s*Optimized Prompt\s*([\s\S]*)$/i);

  const translation = translationMatch?.[1]?.trim() || markdown;
  const optimizedPrompt = promptMatch?.[1]?.trim() || markdown;
  const canonicalMarkdown = `## English Translation\n${translation}\n\n## Optimized Prompt\n${optimizedPrompt}`;

  return {
    markdown: canonicalMarkdown,
    translation,
    optimizedPrompt,
  };
}

export function formatOutputForMode(result: CompileResult, mode: OutputMode): string {
  if (mode === "translation") return result.translation;
  if (mode === "prompt") return result.optimizedPrompt;
  return result.markdown;
}

async function callOpenAICompatible(input: string, config: LLMConfig): Promise<string> {
  const apiKey = config.apiKey.trim();
  const path = config.chatPath || "/v1/chat/completions";
  const url = config.baseUrl.replace(/\/$/, "") + path;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input },
        ],
        temperature: 0.3,
      }),
    },
    config.provider
  );

  if (!res.ok) {
    const text = await res.text();
    throw mapHttpError(config.provider, res.status, text || res.statusText);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model");
  }

  return content.trim();
}

async function callAnthropic(input: string, config: LLMConfig): Promise<string> {
  const apiKey = config.apiKey.trim();
  const normalizedBaseUrl = config.baseUrl.replace(/\/$/, "");
  const url = normalizedBaseUrl.endsWith("/v1") ? `${normalizedBaseUrl}/messages` : `${normalizedBaseUrl}/v1/messages`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: input }],
      }),
    },
    "anthropic"
  );

  if (!res.ok) {
    const text = await res.text();
    throw mapHttpError("anthropic", res.status, text || res.statusText);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const textBlock = data.content?.find((block) => block.type === "text");
  const content = textBlock?.text;
  if (!content) {
    throw new Error("Empty response from model");
  }

  return content.trim();
}

export async function compilePrompt(input: string, config: LLMConfig): Promise<CompileResult> {
  if (!config.apiKey?.trim()) {
    throw new Error("API key is empty. Set it in Extension Preferences (⌘,).");
  }

  const raw =
    config.provider === "anthropic" ? await callAnthropic(input, config) : await callOpenAICompatible(input, config);

  return normalizeModelResponse(raw);
}
