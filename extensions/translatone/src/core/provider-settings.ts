import { requestCompletion, type Fetch } from "./chat-client";
import { InvalidSettingsError } from "./errors";
import { clearModelChoice } from "./models";
import { PROVIDERS, PROVIDER_IDS, type ProviderConfig, type ProviderId } from "./providers";
import type { KeyValueStore } from "./usage";

export interface ManagedProvider extends ProviderConfig {
  readonly enabled: boolean;
}

export interface ProviderSettings {
  readonly providers: readonly ManagedProvider[];
  readonly primary?: ProviderId | undefined;
  readonly allowFallback: boolean;
}

export interface ProviderDraft {
  readonly id: string;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly enabled: boolean;
}

const STORAGE_KEY = "providers:v1";

export function createProvider(draft: ProviderDraft): ManagedProvider {
  if (!isProviderId(draft.id)) {
    throw new InvalidSettingsError("Choose a supported provider type.");
  }
  const info = PROVIDERS[draft.id];
  const baseUrl = draft.baseUrl.trim() || info.defaultBaseUrl;
  const model = draft.model.trim() || info.defaultModel;
  if (!baseUrl) {
    throw new InvalidSettingsError("Custom Base URL is required.");
  }
  if (!model) {
    throw new InvalidSettingsError("Model is required for Custom.");
  }
  const provider = {
    id: draft.id,
    apiKey: draft.apiKey.trim() || undefined,
    model,
    baseUrl: validateBaseUrl(baseUrl),
    enabled: draft.enabled,
  };
  return { ...provider, enabled: draft.enabled && hasCredentials(provider) };
}

export async function loadProviderSettings(store: KeyValueStore): Promise<ProviderSettings> {
  const saved = await store.getItem(STORAGE_KEY);
  if (saved === undefined) {
    return { providers: [], allowFallback: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw invalidStoredSettings();
  }
  if (!isRecord(parsed) || !Array.isArray(parsed["providers"]) || typeof parsed["allowFallback"] !== "boolean") {
    throw invalidStoredSettings();
  }
  const primary = parsed["primary"];
  if (primary !== undefined && !isProviderId(primary)) {
    throw invalidStoredSettings();
  }
  const entries: readonly unknown[] = parsed["providers"];
  const providers = entries.map(readProvider);
  if (new Set(providers.map(({ id }) => id)).size !== providers.length) {
    throw invalidStoredSettings();
  }
  return { providers, primary, allowFallback: parsed["allowFallback"] };
}

export function activeProviders(settings: ProviderSettings): ManagedProvider[] {
  const primary = settings.providers.find(({ id }) => id === settings.primary);
  if (!primary?.enabled || !hasCredentials(primary)) {
    return [];
  }
  return settings.allowFallback
    ? [primary, ...enabledProviders(settings).filter((provider) => provider.id !== primary.id)]
    : [primary];
}

export function enabledProviders(settings: ProviderSettings): ManagedProvider[] {
  return settings.providers.filter((provider) => provider.enabled && hasCredentials(provider));
}

export async function saveProvider(store: KeyValueStore, provider: ManagedProvider): Promise<ProviderSettings> {
  const settings = await loadProviderSettings(store);
  const existing = settings.providers.some(({ id }) => id === provider.id);
  const providers = existing
    ? settings.providers.map((saved) => (saved.id === provider.id ? provider : saved))
    : [...settings.providers, provider];
  await clearModelChoice(store, provider.id);
  return persist(store, {
    ...settings,
    providers,
    primary: settings.primary ?? (provider.enabled ? provider.id : undefined),
  });
}

export async function removeProvider(store: KeyValueStore, id: ProviderId): Promise<ProviderSettings> {
  const settings = await loadProviderSettings(store);
  await clearModelChoice(store, id);
  return persist(store, {
    ...settings,
    providers: settings.providers.filter((provider) => provider.id !== id),
    primary: settings.primary === id ? undefined : settings.primary,
  });
}

export async function resetProviderSettings(store: KeyValueStore): Promise<ProviderSettings> {
  await Promise.all(PROVIDER_IDS.map((id) => clearModelChoice(store, id)));
  return persist(store, { providers: [], allowFallback: false });
}

export async function setProviderEnabled(
  store: KeyValueStore,
  id: ProviderId,
  enabled: boolean,
): Promise<ProviderSettings> {
  const settings = await loadProviderSettings(store);
  const provider = settings.providers.find((entry) => entry.id === id);
  if (!provider) {
    throw new InvalidSettingsError("Provider not found. Add it in Manage Providers.");
  }
  if (enabled && !hasCredentials(provider)) {
    throw new InvalidSettingsError("Add an API key before enabling this provider.");
  }
  const updated = { ...provider, enabled };
  return persist(store, {
    ...settings,
    providers: settings.providers.map((entry) => (entry.id === id ? updated : entry)),
  });
}

export async function setPrimaryProvider(store: KeyValueStore, id: ProviderId): Promise<ProviderSettings> {
  const settings = await loadProviderSettings(store);
  if (!settings.providers.some((provider) => provider.id === id && provider.enabled && hasCredentials(provider))) {
    throw new InvalidSettingsError("Choose an enabled provider with valid settings as primary.");
  }
  return persist(store, { ...settings, primary: id });
}

export async function setProviderFallback(store: KeyValueStore, allowFallback: boolean): Promise<ProviderSettings> {
  return persist(store, { ...(await loadProviderSettings(store)), allowFallback });
}

export async function testProviderConnection(fetchFn: Fetch, provider: ProviderConfig): Promise<void> {
  if (!hasCredentials(provider)) {
    throw new InvalidSettingsError("Add an API key before testing this provider.");
  }
  await requestCompletion(fetchFn, {
    provider,
    systemPrompt: "Reply with OK.",
    text: "Connection test.",
  });
}

function hasCredentials(provider: ProviderConfig): boolean {
  return provider.id === "custom" || provider.id === "ollama" || Boolean(provider.apiKey?.trim());
}

function isProviderId(value: unknown): value is ProviderId {
  return PROVIDER_IDS.some((id) => id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProvider(value: unknown): ManagedProvider {
  if (
    !isRecord(value) ||
    !isProviderId(value["id"]) ||
    typeof value["model"] !== "string" ||
    typeof value["baseUrl"] !== "string" ||
    typeof value["enabled"] !== "boolean" ||
    (value["apiKey"] !== undefined && typeof value["apiKey"] !== "string")
  ) {
    throw invalidStoredSettings();
  }
  return createProvider({
    id: value["id"],
    model: value["model"],
    baseUrl: value["baseUrl"],
    apiKey: value["apiKey"] ?? "",
    enabled: value["enabled"],
  });
}

function invalidStoredSettings(): InvalidSettingsError {
  return new InvalidSettingsError("Saved provider settings are invalid. Open Manage Providers to review them.");
}

async function persist(store: KeyValueStore, settings: ProviderSettings): Promise<ProviderSettings> {
  await store.setItem(STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export function validateBaseUrl(baseUrl: string): string {
  if (!/^https?:\/\//i.test(baseUrl) || !URL.canParse(baseUrl)) {
    throw new InvalidSettingsError(
      "Provider URL must be an absolute HTTP or HTTPS URL. Check the URL in Manage Providers.",
    );
  }
  const url = new URL(baseUrl);
  if (url.username !== "" || url.password !== "") {
    throw new InvalidSettingsError(
      "Provider URL cannot contain credentials. Put the API key in its password field instead.",
    );
  }
  if (baseUrl.includes("?")) {
    throw new InvalidSettingsError("Provider URL cannot contain a query string. Use the API base URL instead.");
  }
  if (baseUrl.includes("#")) {
    throw new InvalidSettingsError("Provider URL cannot contain a fragment. Use the API base URL instead.");
  }
  const loopback =
    url.hostname === "localhost" || url.hostname === "[::1]" || /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
  if (url.protocol === "http:" && !loopback) {
    throw new InvalidSettingsError("Remote provider URLs require HTTPS. HTTP is allowed only for loopback addresses.");
  }
  const normalized = url.toString().replace(/\/+$/, "");
  if (url.pathname.replace(/\/+$/, "").endsWith("/chat/completions")) {
    throw new InvalidSettingsError(
      "Use the API base URL, without /chat/completions. TranslaTone adds the request path.",
    );
  }
  return normalized;
}
