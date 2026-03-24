type EndpointResolver = string | ((baseUrl: string) => string);

export type ProviderId =
  | "raycast"
  | "bigmodel"
  | "deepseek"
  | "openai"
  | "openrouter"
  | "qwen"
  | "zai"
  | "custom";

export interface ProviderDefinition {
  id: string;
  label: string;
  icon?: string;
  defaultModel?: string;
  modelPlaceholder?: string;
  chatEndpoint?: EndpointResolver;
  modelsEndpoint?: EndpointResolver;
  requiresApiKey: boolean;
  requiresBaseUrl?: boolean;
  supportsModelFetch?: boolean;
  buildHeaders?: (apiKey: string) => Record<string, string>;
}

const buildBearerHeaders = (apiKey: string): Record<string, string> =>
  apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

const buildOpenRouterHeaders = (apiKey: string): Record<string, string> => ({
  ...buildBearerHeaders(apiKey),
  "HTTP-Referer": "https://raycast.com",
  "X-Title": "Raycast InFlow",
});

const providerRegistry: readonly ProviderDefinition[] = [
  {
    id: "raycast",
    label: "Raycast AI",
    icon: "model/raycast.svg",
    requiresApiKey: false,
    supportsModelFetch: false,
  },
  {
    id: "bigmodel",
    label: "BigModel",
    icon: "model/bigmodel.svg",
    defaultModel: "glm-4.7-flash",
    chatEndpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    modelsEndpoint: "https://open.bigmodel.cn/api/paas/v4/models",
    requiresApiKey: true,
    supportsModelFetch: true,
    buildHeaders: buildBearerHeaders,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    icon: "model/deepseek.svg",
    defaultModel: "deepseek-chat",
    chatEndpoint: "https://api.deepseek.com/chat/completions",
    modelsEndpoint: "https://api.deepseek.com/models",
    requiresApiKey: true,
    supportsModelFetch: true,
    buildHeaders: buildBearerHeaders,
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: "model/openai.svg",
    defaultModel: "gpt-4o-mini",
    chatEndpoint: "https://api.openai.com/v1/chat/completions",
    modelsEndpoint: "https://api.openai.com/v1/models",
    requiresApiKey: true,
    supportsModelFetch: true,
    buildHeaders: buildBearerHeaders,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    icon: "model/openrouter.svg",
    defaultModel: "google/gemini-2.5-flash",
    chatEndpoint: "https://openrouter.ai/api/v1/chat/completions",
    modelsEndpoint: "https://openrouter.ai/api/v1/models",
    requiresApiKey: true,
    supportsModelFetch: true,
    buildHeaders: buildOpenRouterHeaders,
  },
  {
    id: "qwen",
    label: "Qwen",
    icon: "model/qwen.svg",
    defaultModel: "qwen-turbo",
    chatEndpoint:
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    modelsEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
    requiresApiKey: true,
    supportsModelFetch: true,
    buildHeaders: buildBearerHeaders,
  },
  {
    id: "zai",
    label: "Z.ai",
    icon: "model/zai.svg",
    defaultModel: "glm-4.7-flash",
    chatEndpoint: "https://api.z.ai/api/paas/v4/chat/completions",
    modelsEndpoint: "https://api.z.ai/api/paas/v4/models",
    requiresApiKey: true,
    supportsModelFetch: true,
    buildHeaders: buildBearerHeaders,
  },
  {
    id: "custom",
    label: "Custom",
    icon: "model/custom.svg",
    modelPlaceholder: "e.g., gpt-4o-mini",
    chatEndpoint: (baseUrl: string) => `${baseUrl}/chat/completions`,
    modelsEndpoint: (baseUrl: string) => `${baseUrl}/models`,
    requiresApiKey: false,
    requiresBaseUrl: true,
    supportsModelFetch: true,
    buildHeaders: buildBearerHeaders,
  },
];

export const DEFAULT_PROVIDER_ID: ProviderId = "raycast";
export const PROVIDER_REGISTRY = providerRegistry;

const providerMap = new Map(
  PROVIDER_REGISTRY.map((provider) => [provider.id, provider] as const),
);

export function isProviderId(provider: string): provider is ProviderId {
  return providerMap.has(provider as ProviderId);
}

export function getProviderDefinition(
  provider: string,
): (typeof PROVIDER_REGISTRY)[number] | undefined {
  return providerMap.get(provider as ProviderId);
}

export function getProviderModelPlaceholder(provider: string): string {
  const definition = getProviderDefinition(provider);
  if (!definition) return "";
  if (definition.modelPlaceholder) return definition.modelPlaceholder;
  if (definition.defaultModel) return `Default: ${definition.defaultModel}`;
  return "";
}

export function getProviderHeaders(
  provider: string,
  apiKey: string,
): Record<string, string> {
  const definition = getProviderDefinition(provider);
  if (!definition?.buildHeaders) return {};
  return definition.buildHeaders(apiKey);
}

export function normalizeCustomBaseUrl(baseUrl: string): string {
  return baseUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(chat\/completions|models)\/?$/, "");
}

function resolveEndpoint(
  endpoint: EndpointResolver | undefined,
  baseUrl?: string,
): string | undefined {
  if (!endpoint) return undefined;
  if (typeof endpoint === "string") return endpoint;

  const normalizedBaseUrl = normalizeCustomBaseUrl(baseUrl || "");
  if (!normalizedBaseUrl) return undefined;
  return endpoint(normalizedBaseUrl);
}

export function getProviderChatEndpoint(
  provider: string,
  baseUrl?: string,
): string | undefined {
  return resolveEndpoint(
    getProviderDefinition(provider)?.chatEndpoint,
    baseUrl,
  );
}

export function getProviderModelsEndpoint(
  provider: string,
  baseUrl?: string,
): string | undefined {
  return resolveEndpoint(
    getProviderDefinition(provider)?.modelsEndpoint,
    baseUrl,
  );
}
