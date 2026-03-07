import { getPreferenceValues, LocalStorage } from "@raycast/api";

type LegacyProviderPrefs = {
  apiKey?: string;
  apiBaseUrl?: string;
  model?: string;
};

export type AIProvider = {
  id: string;
  name: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type ProviderInput = {
  name: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  setAsActive?: boolean;
};

export type ProviderState = {
  providers: AIProvider[];
  activeProviderId?: string;
  legacyProvider?: AIProvider;
};

const PROVIDERS_STORAGE_KEY = "providers";
const ACTIVE_PROVIDER_ID_STORAGE_KEY = "active-provider-id";
export const LEGACY_PROVIDER_ID = "legacy-preferences-provider";

export async function getProviderState(): Promise<ProviderState> {
  const providers = await getStoredProviders();

  if (providers.length > 0) {
    let activeProviderId = await getStoredActiveProviderId();

    if (!activeProviderId || !providers.some((provider) => provider.id === activeProviderId)) {
      activeProviderId = providers[0].id;
      await LocalStorage.setItem(ACTIVE_PROVIDER_ID_STORAGE_KEY, activeProviderId);
    }

    return { providers, activeProviderId };
  }

  const legacyProvider = getLegacyProviderFromPreferences();

  return {
    providers,
    activeProviderId: legacyProvider?.id,
    legacyProvider
  };
}

export async function getProviderForRequest(providerId?: string): Promise<AIProvider> {
  const state = await getProviderState();

  if (providerId) {
    if (providerId === LEGACY_PROVIDER_ID && state.legacyProvider) {
      return state.legacyProvider;
    }

    const requestedProvider = state.providers.find((provider) => provider.id === providerId);

    if (requestedProvider) {
      return requestedProvider;
    }

    throw new Error("Selected AI provider was not found. Open Manage AI Providers and choose another one.");
  }

  if (state.providers.length > 0) {
    return state.providers.find((provider) => provider.id === state.activeProviderId) ?? state.providers[0];
  }

  if (state.legacyProvider) {
    return state.legacyProvider;
  }

  throw new Error("No AI provider configured. Open Manage AI Providers and add one.");
}

export async function saveProvider(input: ProviderInput, providerId?: string): Promise<AIProvider> {
  const values = normalizeProviderInput(input);
  const providers = await getStoredProviders();
  const activeProviderId = await getStoredActiveProviderId();
  const existingProvider = providerId ? providers.find((provider) => provider.id === providerId) : undefined;

  if (providerId && !existingProvider) {
    throw new Error("Provider could not be found.");
  }

  const timestamp = new Date().toISOString();
  const provider: AIProvider = {
    id: existingProvider?.id ?? createProviderId(),
    name: values.name,
    apiKey: values.apiKey,
    apiBaseUrl: values.apiBaseUrl,
    model: values.model,
    createdAt: existingProvider?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  const nextProviders = existingProvider
    ? providers.map((storedProvider) => (storedProvider.id === provider.id ? provider : storedProvider))
    : [provider, ...providers];

  await writeStoredProviders(nextProviders);

  const shouldSetActive = values.setAsActive || nextProviders.length === 1 || activeProviderId === provider.id;

  if (shouldSetActive) {
    await LocalStorage.setItem(ACTIVE_PROVIDER_ID_STORAGE_KEY, provider.id);
  }

  return provider;
}

export async function deleteProvider(providerId: string) {
  const providers = await getStoredProviders();
  const nextProviders = providers.filter((provider) => provider.id !== providerId);

  if (nextProviders.length === providers.length) {
    return;
  }

  await writeStoredProviders(nextProviders);

  const activeProviderId = await getStoredActiveProviderId();

  if (activeProviderId === providerId) {
    if (nextProviders[0]) {
      await LocalStorage.setItem(ACTIVE_PROVIDER_ID_STORAGE_KEY, nextProviders[0].id);
    } else {
      await LocalStorage.removeItem(ACTIVE_PROVIDER_ID_STORAGE_KEY);
    }
  }
}

export async function setActiveProviderId(providerId: string) {
  if (providerId === LEGACY_PROVIDER_ID) {
    await LocalStorage.removeItem(ACTIVE_PROVIDER_ID_STORAGE_KEY);
    return;
  }

  const providers = await getStoredProviders();

  if (!providers.some((provider) => provider.id === providerId)) {
    throw new Error("Selected provider was not found.");
  }

  await LocalStorage.setItem(ACTIVE_PROVIDER_ID_STORAGE_KEY, providerId);
}

export async function importLegacyProvider() {
  const legacyProvider = getLegacyProviderFromPreferences();

  if (!legacyProvider) {
    throw new Error("No legacy provider is configured in preferences.");
  }

  return saveProvider(
    {
      name: legacyProvider.name,
      apiKey: legacyProvider.apiKey,
      apiBaseUrl: legacyProvider.apiBaseUrl,
      model: legacyProvider.model,
      setAsActive: true
    },
    undefined
  );
}

export function getProviderHost(apiBaseUrl: string) {
  const trimmedUrl = apiBaseUrl.trim().replace(/\/+$/, "");

  try {
    return new URL(trimmedUrl).host;
  } catch {
    return trimmedUrl.replace(/^https?:\/\//, "") || "custom";
  }
}

async function getStoredProviders() {
  const rawProviders = await LocalStorage.getItem<string>(PROVIDERS_STORAGE_KEY);

  if (!rawProviders) {
    return [];
  }

  try {
    const parsedProviders = JSON.parse(rawProviders);

    if (!Array.isArray(parsedProviders)) {
      return [];
    }

    return parsedProviders.filter(isStoredProvider).map(normalizeStoredProvider);
  } catch {
    return [];
  }
}

async function writeStoredProviders(providers: AIProvider[]) {
  await LocalStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
}

async function getStoredActiveProviderId() {
  return LocalStorage.getItem<string>(ACTIVE_PROVIDER_ID_STORAGE_KEY);
}

function getLegacyProviderFromPreferences(): AIProvider | undefined {
  const { apiKey = "", apiBaseUrl = "", model = "" } = getPreferenceValues<LegacyProviderPrefs>();

  if (!apiKey.trim() || !apiBaseUrl.trim() || !model.trim()) {
    return undefined;
  }

  const normalizedBaseUrl = apiBaseUrl.trim();

  return {
    id: LEGACY_PROVIDER_ID,
    name: `Legacy Provider (${getProviderHost(normalizedBaseUrl)})`,
    apiKey: apiKey.trim(),
    apiBaseUrl: normalizedBaseUrl,
    model: model.trim(),
    createdAt: "",
    updatedAt: ""
  };
}

function normalizeProviderInput(input: ProviderInput) {
  const name = input.name.trim();
  const apiKey = input.apiKey.trim();
  const apiBaseUrl = input.apiBaseUrl.trim();
  const model = input.model.trim();

  if (!name) {
    throw new Error("Provider name is required.");
  }

  if (!apiKey) {
    throw new Error("API key is required.");
  }

  if (!apiBaseUrl) {
    throw new Error("API base URL is required.");
  }

  if (!model) {
    throw new Error("Model name is required.");
  }

  return {
    name,
    apiKey,
    apiBaseUrl,
    model,
    setAsActive: input.setAsActive ?? false
  };
}

function normalizeStoredProvider(provider: AIProvider): AIProvider {
  return {
    ...provider,
    name: provider.name.trim(),
    apiKey: provider.apiKey.trim(),
    apiBaseUrl: provider.apiBaseUrl.trim(),
    model: provider.model.trim()
  };
}

function isStoredProvider(value: unknown): value is AIProvider {
  if (!value || typeof value !== "object") {
    return false;
  }

  const provider = value as Record<string, unknown>;

  return ["id", "name", "apiKey", "apiBaseUrl", "model", "createdAt", "updatedAt"].every(
    (key) => typeof provider[key] === "string"
  );
}

function createProviderId() {
  return `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}