import { LocalStorage, getPreferenceValues } from "@raycast/api";

import type { LibrarySection, PlexServerResource, PlexSetupStatus } from "./types";

interface PreferenceOverrides {
  plexampUrl?: string;
}

interface ManagedConfig {
  plexToken?: string;
  plexServerUrl?: string;
  plexServerToken?: string;
  serverMachineIdentifier?: string;
  serverName?: string;
  musicLibrary?: string;
}

interface ResolvedConfig extends ManagedConfig {
  plexToken: string;
  plexServerUrl: string;
  plexampUrl: string;
}

const MANAGED_TOKEN_KEY = "plexamp-managed-token";
const MANAGED_SERVER_URL_KEY = "plexamp-managed-server-url";
const MANAGED_SERVER_TOKEN_KEY = "plexamp-managed-server-token";
const MANAGED_SERVER_ID_KEY = "plexamp-managed-server-id";
const MANAGED_SERVER_NAME_KEY = "plexamp-managed-server-name";
const MANAGED_LIBRARY_KEY = "plexamp-managed-library";

export const DEFAULT_PLEXAMP_URL = "http://127.0.0.1:32500";
export const PLEX_TV_BASE_URL = "https://plex.tv";

let cachedManagedConfigPromise: Promise<ManagedConfig> | undefined;
let cachedManagedConfig: ManagedConfig | undefined;
const configInvalidators = new Set<() => void>();

function normalizeOptionalValue(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getPreferenceOverrides(): PreferenceOverrides {
  const preferences = getPreferenceValues<Preferences>();
  const plexampUrl = normalizeOptionalValue(preferences.plexampUrl);

  return {
    plexampUrl: plexampUrl ? stripTrailingSlash(plexampUrl) : undefined,
  };
}

function stripTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function registerConfigInvalidator(invalidator: () => void): () => void {
  configInvalidators.add(invalidator);

  return () => {
    configInvalidators.delete(invalidator);
  };
}

function invalidateCachedConfig() {
  cachedManagedConfigPromise = undefined;
  cachedManagedConfig = undefined;

  for (const invalidator of configInvalidators) {
    invalidator();
  }
}

async function getManagedConfig(): Promise<ManagedConfig> {
  if (cachedManagedConfig) {
    return cachedManagedConfig;
  }

  if (!cachedManagedConfigPromise) {
    cachedManagedConfigPromise = (async () => {
      const [plexToken, plexServerUrl, plexServerToken, serverMachineIdentifier, serverName, musicLibrary] =
        await Promise.all([
          LocalStorage.getItem<string>(MANAGED_TOKEN_KEY),
          LocalStorage.getItem<string>(MANAGED_SERVER_URL_KEY),
          LocalStorage.getItem<string>(MANAGED_SERVER_TOKEN_KEY),
          LocalStorage.getItem<string>(MANAGED_SERVER_ID_KEY),
          LocalStorage.getItem<string>(MANAGED_SERVER_NAME_KEY),
          LocalStorage.getItem<string>(MANAGED_LIBRARY_KEY),
        ]);

      return {
        plexToken: plexToken || undefined,
        plexServerUrl: plexServerUrl || undefined,
        plexServerToken: plexServerToken || undefined,
        serverMachineIdentifier: serverMachineIdentifier || undefined,
        serverName: serverName || undefined,
        musicLibrary: musicLibrary || undefined,
      };
    })();
  }

  cachedManagedConfig = await cachedManagedConfigPromise;
  return cachedManagedConfig;
}

function buildResolvedConfig(overrides: PreferenceOverrides, managed: ManagedConfig): ResolvedConfig {
  const plexToken = managed.plexToken ?? "";
  const plexServerUrl = managed.plexServerUrl ?? "";

  return {
    plexToken,
    plexServerUrl,
    plexampUrl: overrides.plexampUrl ?? DEFAULT_PLEXAMP_URL,
    plexServerToken: managed.plexServerToken ?? plexToken,
    serverMachineIdentifier: managed.serverMachineIdentifier,
    serverName: managed.serverName,
    musicLibrary: managed.musicLibrary,
  };
}

export async function getConfig(): Promise<ResolvedConfig> {
  return buildResolvedConfig(getPreferenceOverrides(), await getManagedConfig());
}

export function getConfiguredPlexampUrl(): string {
  return getPreferenceOverrides().plexampUrl ?? DEFAULT_PLEXAMP_URL;
}

export async function requirePlexToken(): Promise<string> {
  const config = await getConfig();

  if (!config.plexToken) {
    throw new Error("Sign in to Plex to continue.");
  }

  return config.plexToken;
}

export async function requireServerConfig(): Promise<ResolvedConfig> {
  const config = await getConfig();

  if (!config.plexToken) {
    throw new Error("Sign in to Plex to continue.");
  }

  if (!config.plexServerUrl) {
    throw new Error("Select a Plex server to continue.");
  }

  return config;
}

export async function saveManagedAuthToken(token: string): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(MANAGED_TOKEN_KEY, token),
    LocalStorage.removeItem(MANAGED_SERVER_URL_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_TOKEN_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_ID_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_NAME_KEY),
    LocalStorage.removeItem(MANAGED_LIBRARY_KEY),
  ]);
  invalidateCachedConfig();
}

export async function clearManagedConfiguration(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem(MANAGED_TOKEN_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_URL_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_TOKEN_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_ID_KEY),
    LocalStorage.removeItem(MANAGED_SERVER_NAME_KEY),
    LocalStorage.removeItem(MANAGED_LIBRARY_KEY),
  ]);
  invalidateCachedConfig();
}

export async function saveSelectedServer(server: PlexServerResource, connectionUri?: string): Promise<void> {
  const uri = connectionUri ?? server.preferredConnection?.uri ?? server.connections[0]?.uri;

  if (!uri) {
    throw new Error(`No usable connection was found for ${server.name}.`);
  }

  await Promise.all([
    LocalStorage.setItem(MANAGED_SERVER_URL_KEY, uri),
    server.accessToken
      ? LocalStorage.setItem(MANAGED_SERVER_TOKEN_KEY, server.accessToken)
      : LocalStorage.removeItem(MANAGED_SERVER_TOKEN_KEY),
    LocalStorage.setItem(MANAGED_SERVER_ID_KEY, server.clientIdentifier),
    LocalStorage.setItem(MANAGED_SERVER_NAME_KEY, server.name),
    LocalStorage.removeItem(MANAGED_LIBRARY_KEY),
  ]);
  invalidateCachedConfig();
}

export async function saveSelectedLibrary(library: LibrarySection): Promise<void> {
  await LocalStorage.setItem(MANAGED_LIBRARY_KEY, library.key);
  invalidateCachedConfig();
}

export async function getPlexSetupStatus(): Promise<PlexSetupStatus> {
  const managed = await getManagedConfig();
  const config = buildResolvedConfig(getPreferenceOverrides(), managed);

  return {
    plexampUrl: config.plexampUrl,
    hasSavedToken: Boolean(managed.plexToken),
    hasEffectiveToken: Boolean(config.plexToken),
    hasEffectiveServer: Boolean(config.plexServerUrl),
    selectedServerName: managed.serverName,
    selectedLibrary: managed.musicLibrary,
  };
}

export function getImageUrl(path?: string, options?: { baseUrl?: string; token?: string }): string | undefined {
  if (!path) {
    return undefined;
  }

  const baseUrl = options?.baseUrl ?? cachedManagedConfig?.plexServerUrl;
  const token =
    options?.token ??
    (options?.baseUrl
      ? cachedManagedConfig?.plexToken
      : (cachedManagedConfig?.plexServerToken ?? cachedManagedConfig?.plexToken));

  if (!baseUrl || !token) {
    return undefined;
  }

  const url = new URL(path, `${baseUrl}/`);
  url.searchParams.set("X-Plex-Token", token);
  return url.toString();
}
