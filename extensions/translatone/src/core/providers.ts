export const BYOK_PROVIDER_IDS = ["openai", "anthropic", "openrouter", "custom"] as const;

export const PROVIDER_IDS = ["groq", "gemini", "ollama", ...BYOK_PROVIDER_IDS] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type UsagePeriod = "day" | "month";

export interface UsageLimit {
  readonly period: UsagePeriod;
  readonly maxRequests: number;
}

export interface ProviderInfo {
  readonly id: ProviderId;
  readonly name: string;
  readonly defaultBaseUrl: string;
  readonly defaultModel: string;
  readonly limit: UsageLimit | undefined;
  readonly keyUrl?: string;
}

export interface KeyPageLink {
  readonly title: string;
  readonly url: string;
}

export const PROVIDERS: Readonly<Record<ProviderId, ProviderInfo>> = {
  groq: {
    id: "groq",
    keyUrl: "https://console.groq.com/keys",
    name: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    limit: { period: "day", maxRequests: 1_000 },
  },
  gemini: {
    id: "gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
    name: "Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    limit: { period: "day", maxRequests: 250 },
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    limit: undefined,
  },
  openai: {
    id: "openai",
    keyUrl: "https://platform.openai.com/api-keys",
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    limit: undefined,
  },
  anthropic: {
    id: "anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    name: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-haiku-5-5",
    limit: undefined,
  },
  openrouter: {
    id: "openrouter",
    keyUrl: "https://openrouter.ai/settings/keys",
    name: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    limit: undefined,
  },
  custom: {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    defaultBaseUrl: "",
    defaultModel: "",
    limit: undefined,
  },
};

export function keyPageLinks(): KeyPageLink[] {
  return PROVIDER_IDS.flatMap((id) => {
    const { name, keyUrl, limit } = PROVIDERS[id];
    return keyUrl ? [{ title: keyPageTitle(name, limit !== undefined), url: keyUrl }] : [];
  });
}

function keyPageTitle(name: string, free: boolean): string {
  if (free) {
    return `Get a Free ${name} Key`;
  }
  return `Get ${/^[AEIOU]/.test(name) ? "an" : "a"} ${name} Key`;
}

export interface ProviderConfig {
  readonly id: ProviderId;
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string | undefined;
}

export function providersAfter(providers: readonly ProviderConfig[], answered: ProviderId): readonly ProviderConfig[] {
  const index = providers.findIndex((provider) => provider.id === answered);
  if (index === -1) {
    return providers;
  }
  const rotated = [...providers.slice(index + 1), ...providers.slice(0, index)];
  return rotated.length > 0 ? rotated : providers;
}
