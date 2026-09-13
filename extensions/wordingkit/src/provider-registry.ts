export const PROVIDER_REGISTRY = [
  {
    id: "openai",
    title: "OpenAI",
    location: "cloud",
    adapter: "openai-compatible",
    credentialKey: "openaiApiKey",
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  {
    id: "anthropic",
    title: "Anthropic",
    location: "cloud",
    adapter: "anthropic",
    credentialKey: "anthropicApiKey",
    defaultBaseUrl: "https://api.anthropic.com/v1",
  },
  {
    id: "groq",
    title: "Groq",
    location: "cloud",
    adapter: "openai-compatible",
    credentialKey: "groqApiKey",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
  },
  {
    id: "ollama",
    title: "Ollama",
    location: "local",
    adapter: "ollama",
    credentialKey: null,
    defaultBaseUrl: "http://127.0.0.1:11434",
  },
] as const;

export type ProviderDefinition = (typeof PROVIDER_REGISTRY)[number];
export type Provider = ProviderDefinition["id"];
export type ProviderLocation = ProviderDefinition["location"];
export type ProviderAdapter = ProviderDefinition["adapter"];
export type ProviderCredentialKey = Exclude<
  ProviderDefinition["credentialKey"],
  null
>;

const providersById = new Map<string, ProviderDefinition>(
  PROVIDER_REGISTRY.map((provider) => [provider.id, provider]),
);

export function getProviderDefinition(
  value: unknown,
): ProviderDefinition | undefined {
  return typeof value === "string" ? providersById.get(value) : undefined;
}

export function isProvider(value: unknown): value is Provider {
  return getProviderDefinition(value) !== undefined;
}
