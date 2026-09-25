export type GenerationProvider =
  | "raycast"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "google";

export type ProviderModel = { id: string; name: string };
export type ProviderAnswer = { text: string; incompleteReason?: string };

export const PROVIDER_OPTIONS: { id: GenerationProvider; name: string }[] = [
  { id: "openrouter", name: "OpenRouter" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google Gemini" },
  { id: "raycast", name: "Raycast AI" },
];

export const SUGGESTED_MODELS: Record<
  Exclude<GenerationProvider, "raycast" | "openrouter">,
  ProviderModel[]
> = {
  openai: [
    { id: "gpt-5-mini", name: "GPT-5 Mini" },
    { id: "gpt-5.4", name: "GPT-5.4" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
  ],
  google: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
  ],
};

const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    defaultModel: "openai/gpt-5-mini",
    key: "openRouterApiKey",
  },
  openai: {
    name: "OpenAI",
    defaultModel: "gpt-5-mini",
    key: "openAIApiKey",
  },
  anthropic: {
    name: "Anthropic",
    defaultModel: "claude-sonnet-4-6",
    key: "anthropicApiKey",
  },
  google: {
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    key: "googleApiKey",
  },
} as const;

export function getDefaultProviderModel(provider: GenerationProvider): string {
  return provider === "raycast" ? "" : PROVIDERS[provider].defaultModel;
}

export async function loadOpenRouterModels(
  apiKey: string | undefined,
  signal?: AbortSignal,
): Promise<ProviderModel[]> {
  if (!apiKey?.trim()) return [];
  const response = await fetch(
    "https://openrouter.ai/api/v1/models?output_modalities=text&sort=most-popular",
    {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal,
    },
  );
  if (!response.ok) {
    throw new Error(`OpenRouter model list returned HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as { data?: unknown };
  if (!Array.isArray(payload.data)) {
    throw new Error("OpenRouter returned an invalid model list.");
  }
  return payload.data
    .filter(
      (item): item is { id: string; name: string } =>
        typeof item?.id === "string" && typeof item?.name === "string",
    )
    .map(({ id, name }) => ({ id, name }));
}

type ProviderResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  output?: { content?: { type?: string; text?: string }[] }[];
  status?: string;
  incomplete_details?: { reason?: string };
  content?: { type?: string; text?: string }[];
  stop_reason?: string;
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { message?: string };
};

export function getProviderSummary(settings: Preferences): string {
  const provider = settings.generationProvider ?? "openrouter";
  if (provider === "raycast") return "Raycast AI uses your Raycast account.";
  const config = PROVIDERS[provider];
  const model = settings.providerModel?.trim() || config.defaultModel;
  if (!settings[config.key]?.trim()) {
    return `${config.name} · ${model}. Add your ${config.name} API key in extension preferences before generating.`;
  }
  return `${config.name} · ${model}. Requests go directly to ${config.name} using the API key in extension preferences.`;
}

export async function askProvider(
  prompt: string,
  settings: Preferences,
  signal?: AbortSignal,
): Promise<ProviderAnswer> {
  const provider = settings.generationProvider ?? "openrouter";
  if (provider === "raycast") {
    throw new Error("Raycast AI must be called through Raycast's AI API.");
  }

  const config = PROVIDERS[provider];
  const apiKey = settings[config.key]?.trim();
  if (!apiKey) {
    throw new Error(
      `Add your ${config.name} API key in Text Enhance extension preferences.`,
    );
  }
  const model = settings.providerModel?.trim() || config.defaultModel;

  if (provider === "openrouter") {
    const data = await postJson(
      "https://openrouter.ai/api/v1/chat/completions",
      { Authorization: `Bearer ${apiKey}` },
      { model, messages: [{ role: "user", content: prompt }] },
      config.name,
      signal,
    );
    return {
      text: readText(data?.choices?.[0]?.message?.content, config.name),
      incompleteReason:
        data?.choices?.[0]?.finish_reason === "length"
          ? "OpenRouter stopped at the model's output limit."
          : undefined,
    };
  }

  if (provider === "openai") {
    const data = await postJson(
      "https://api.openai.com/v1/responses",
      { Authorization: `Bearer ${apiKey}` },
      { model, input: prompt },
      config.name,
      signal,
    );
    const content = data?.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("");
    return {
      text: readText(content, config.name),
      incompleteReason:
        data?.status === "incomplete"
          ? `OpenAI stopped before finishing${data.incomplete_details?.reason ? ` (${data.incomplete_details.reason})` : ""}.`
          : undefined,
    };
  }

  if (provider === "anthropic") {
    const data = await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      {
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      },
      config.name,
      signal,
    );
    const content = data?.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text ?? "")
      .join("");
    return {
      text: readText(content, config.name),
      incompleteReason:
        data?.stop_reason === "max_tokens" ||
        data?.stop_reason === "model_context_window_exceeded"
          ? "Anthropic stopped at an output or context limit."
          : undefined,
    };
  }

  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": apiKey },
    { contents: [{ parts: [{ text: prompt }] }] },
    config.name,
    signal,
  );
  const content = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  return {
    text: readText(content, config.name),
    incompleteReason:
      data?.candidates?.[0]?.finishReason === "MAX_TOKENS"
        ? "Google Gemini stopped at the model's output limit."
        : undefined,
  };
}

function readText(value: unknown, provider: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${provider} returned no text. Try a different model ID.`);
  }
  return value.trim();
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  provider: string,
  signal?: AbortSignal,
): Promise<ProviderResponse | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
        : AbortSignal.timeout(60_000),
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new DOMException("Generation cancelled", "AbortError");
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`${provider} timed out after 60 seconds.`);
    }
    throw new Error(
      `${provider} could not be reached. Check your connection and try again.`,
    );
  }

  const data = (await response
    .json()
    .catch(() => null)) as ProviderResponse | null;
  if (!response.ok) {
    const detail =
      typeof data?.error?.message === "string"
        ? data.error.message.slice(0, 250)
        : "Check the API key and model ID.";
    throw new Error(`${provider} returned HTTP ${response.status}: ${detail}`);
  }
  return data;
}
