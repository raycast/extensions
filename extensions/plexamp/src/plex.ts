import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

import type {
  AudioPlaylist,
  LibraryStats,
  LibrarySection,
  MetadataItem,
  PlexAuthPin,
  PlexServerConnection,
  PlexServerResource,
  MusicAlbum,
  MusicArtist,
  MusicTrack,
  PlayQueueInfo,
  PlayableItem,
  PlexampClientInfo,
  PlexSetupStatus,
  SearchResults,
  TimelineInfo,
} from "./types";

interface Preferences {
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

interface ServerIdentity {
  machineIdentifier: string;
  address: string;
  port: string;
  protocol: string;
}

type XmlNode = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
});

const CLIENT_IDENTIFIER_KEY = "plexamp-client-identifier";
const COMMAND_ID_KEY = "plexamp-command-id";
const MANAGED_TOKEN_KEY = "plexamp-managed-token";
const MANAGED_SERVER_URL_KEY = "plexamp-managed-server-url";
const MANAGED_SERVER_TOKEN_KEY = "plexamp-managed-server-token";
const MANAGED_SERVER_ID_KEY = "plexamp-managed-server-id";
const MANAGED_SERVER_NAME_KEY = "plexamp-managed-server-name";
const MANAGED_LIBRARY_KEY = "plexamp-managed-library";
const DEFAULT_PLEXAMP_URL = "http://127.0.0.1:32500";
const PLEX_TV_BASE_URL = "https://plex.tv";
let serverIdentityPromise: Promise<ServerIdentity> | undefined;
let cachedManagedConfigPromise: Promise<ManagedConfig> | undefined;
let cachedManagedConfig: ManagedConfig | undefined;

function normalizeOptionalValue(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getPreferenceOverrides(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  const plexampUrl = normalizeOptionalValue(preferences.plexampUrl);

  return {
    plexampUrl: plexampUrl ? stripTrailingSlash(plexampUrl) : undefined,
  };
}

function stripTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function invalidateCachedConfig() {
  cachedManagedConfigPromise = undefined;
  cachedManagedConfig = undefined;
  serverIdentityPromise = undefined;
}

async function getManagedConfig(): Promise<ManagedConfig> {
  if (cachedManagedConfig) {
    return cachedManagedConfig;
  }

  if (!cachedManagedConfigPromise) {
    cachedManagedConfigPromise = (async () => {
      const [
        plexToken,
        plexServerUrl,
        plexServerToken,
        serverMachineIdentifier,
        serverName,
        musicLibrary,
      ] = await Promise.all([
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

function buildResolvedConfig(
  overrides: Preferences,
  managed: ManagedConfig,
): ResolvedConfig {
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

async function getConfig(): Promise<ResolvedConfig> {
  return buildResolvedConfig(
    getPreferenceOverrides(),
    await getManagedConfig(),
  );
}

function getConfiguredPlexampUrl(): string {
  return getPreferenceOverrides().plexampUrl ?? DEFAULT_PLEXAMP_URL;
}

async function requirePlexToken(): Promise<string> {
  const config = await getConfig();

  if (!config.plexToken) {
    throw new Error("Sign in to Plex to continue.");
  }

  return config.plexToken;
}

async function requireServerConfig(): Promise<ResolvedConfig> {
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

export async function saveSelectedServer(
  server: PlexServerResource,
): Promise<void> {
  const preferredConnection =
    server.preferredConnection ?? server.connections[0];

  if (!preferredConnection) {
    throw new Error(`No usable connection was found for ${server.name}.`);
  }

  await Promise.all([
    LocalStorage.setItem(MANAGED_SERVER_URL_KEY, preferredConnection.uri),
    server.accessToken
      ? LocalStorage.setItem(MANAGED_SERVER_TOKEN_KEY, server.accessToken)
      : LocalStorage.removeItem(MANAGED_SERVER_TOKEN_KEY),
    LocalStorage.setItem(MANAGED_SERVER_ID_KEY, server.clientIdentifier),
    LocalStorage.setItem(MANAGED_SERVER_NAME_KEY, server.name),
    LocalStorage.removeItem(MANAGED_LIBRARY_KEY),
  ]);
  invalidateCachedConfig();
}

export async function saveSelectedLibrary(
  library: LibrarySection,
): Promise<void> {
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

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (entity, token: string) => {
      const normalizedToken = token.toLowerCase();

      if (normalizedToken === "amp") {
        return "&";
      }

      if (normalizedToken === "lt") {
        return "<";
      }

      if (normalizedToken === "gt") {
        return ">";
      }

      if (normalizedToken === "quot") {
        return '"';
      }

      if (normalizedToken === "apos") {
        return "'";
      }

      if (normalizedToken === "nbsp") {
        return "\u00a0";
      }

      const codePoint = normalizedToken.startsWith("#x")
        ? Number.parseInt(normalizedToken.slice(2), 16)
        : normalizedToken.startsWith("#")
          ? Number.parseInt(normalizedToken.slice(1), 10)
          : Number.NaN;

      if (!Number.isFinite(codePoint)) {
        return entity;
      }

      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return entity;
      }
    },
  );
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return decodeXmlEntities(String(value));
}

function asNumber(value: unknown): number | undefined {
  const stringValue = asString(value);
  if (!stringValue) {
    return undefined;
  }

  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requiredString(value: unknown, field: string): string {
  const result = asString(value);
  if (!result) {
    throw new Error(`Missing required Plex field: ${field}`);
  }

  return result;
}

function asBoolean(value: unknown): boolean {
  const stringValue = asString(value)?.toLowerCase();
  return stringValue === "1" || stringValue === "true";
}

function buildMetadataKey(ratingKey: string): string {
  return `/library/metadata/${ratingKey}`;
}

function getArtworkPath(item: XmlNode): string | undefined {
  return (
    asString(item.thumb) ??
    asString(item.parentThumb) ??
    asString(item.grandparentThumb) ??
    asString(item.composite)
  );
}

function getFirstNestedTag(item: XmlNode, key: string): string | undefined {
  const node = arrayify(item[key])[0];

  if (!node || typeof node !== "object") {
    return undefined;
  }

  return asString((node as XmlNode).tag);
}

function firstObject(values: unknown): XmlNode | undefined {
  return arrayify(values).find(
    (node): node is XmlNode => typeof node === "object",
  );
}

function deduplicateByRatingKey<T extends { ratingKey: string }>(
  items: T[],
): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.ratingKey)) {
      return false;
    }

    seen.add(item.ratingKey);
    return true;
  });
}

function parseMediaContainer(xml: string): XmlNode {
  if (!xml.trim()) {
    return {};
  }

  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const container = parsed.MediaContainer ?? parsed.Response ?? parsed;

  if (!container || typeof container !== "object") {
    return {};
  }

  return container as XmlNode;
}

function parseArtist(node: XmlNode): MusicArtist {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");

  return {
    type: "artist",
    ratingKey,
    key: buildMetadataKey(ratingKey),
    browseKey: asString(node.key) ?? `${buildMetadataKey(ratingKey)}/children`,
    title: requiredString(node.title, "title"),
    summary: asString(node.summary),
    thumb: getArtworkPath(node),
  };
}

function parseAlbum(node: XmlNode): MusicAlbum {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");

  return {
    type: "album",
    ratingKey,
    key: buildMetadataKey(ratingKey),
    browseKey: asString(node.key) ?? `${buildMetadataKey(ratingKey)}/children`,
    title: requiredString(node.title, "title"),
    parentTitle: asString(node.parentTitle),
    year: asNumber(node.year),
    leafCount: asNumber(node.leafCount),
    duration: asNumber(node.duration),
    releaseType:
      asString(node.subtype) ??
      getFirstNestedTag(node, "Subformat") ??
      asString(node.subformat) ??
      getFirstNestedTag(node, "Format") ??
      asString(node.format) ??
      asString(node.albumType),
    releaseSubType:
      getFirstNestedTag(node, "Format") ??
      asString(node.format) ??
      asString(node.albumType),
    thumb: getArtworkPath(node),
  };
}

function parseTrack(node: XmlNode): MusicTrack {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");
  const librarySectionKey = normalizeLibrarySectionKey(
    asString(node.librarySectionKey) ?? asString(node.librarySectionID),
  );

  return {
    type: "track",
    ratingKey,
    key: asString(node.key) ?? buildMetadataKey(ratingKey),
    title: requiredString(node.title, "title"),
    userRating: asNumber(node.userRating),
    parentRatingKey: asString(node.parentRatingKey),
    parentTitle: asString(node.parentTitle),
    grandparentRatingKey: asString(node.grandparentRatingKey),
    grandparentTitle: asString(node.grandparentTitle),
    librarySectionKey,
    duration: asNumber(node.duration),
    index: asNumber(node.index),
    parentIndex: asNumber(node.parentIndex),
    thumb: getArtworkPath(node),
    playQueueItemID: asString(node.playQueueItemID),
  };
}

function parsePlaylist(node: XmlNode): AudioPlaylist {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");

  return {
    type: "playlist",
    ratingKey,
    key: `/playlists/${ratingKey}`,
    browseKey: asString(node.key) ?? `/playlists/${ratingKey}/items`,
    title: requiredString(node.title, "title"),
    leafCount: asNumber(node.leafCount),
    thumb: getArtworkPath(node),
  };
}

function normalizeLibrarySectionKey(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  const match = normalized.match(/^\/library\/sections\/([^/]+)$/);
  return match?.[1] ?? normalized;
}

function getLibrarySectionKey(node: XmlNode): string | undefined {
  const explicitKey = normalizeLibrarySectionKey(
    asString(node.librarySectionKey),
  );

  if (explicitKey) {
    return explicitKey;
  }

  return normalizeLibrarySectionKey(asString(node.librarySectionID));
}

function parseMetadataItem(container: XmlNode): MetadataItem | undefined {
  const metadata = arrayify(container.Metadata)[0];
  if (metadata && typeof metadata === "object") {
    const type = asString((metadata as XmlNode).type);

    if (type === "track") {
      return parseTrack(metadata as XmlNode);
    }

    if (type === "artist") {
      return parseArtist(metadata as XmlNode);
    }

    if (type === "album") {
      return parseAlbum(metadata as XmlNode);
    }
  }

  const track = arrayify(container.Track)[0];
  if (track && typeof track === "object") {
    return parseTrack(track as XmlNode);
  }

  const playlist = arrayify(container.Playlist)[0];
  if (playlist && typeof playlist === "object") {
    return parsePlaylist(playlist as XmlNode);
  }

  const directory = arrayify(container.Directory)[0];
  if (directory && typeof directory === "object") {
    const type = asString((directory as XmlNode).type);

    if (type === "artist") {
      return parseArtist(directory as XmlNode);
    }

    if (type === "album") {
      return parseAlbum(directory as XmlNode);
    }
  }

  return undefined;
}

async function hydrateAlbums(albums: MusicAlbum[]): Promise<MusicAlbum[]> {
  const hydratedAlbums: MusicAlbum[] = [];

  for (let index = 0; index < albums.length; index += 6) {
    const batch = albums.slice(index, index + 6);
    const results = await Promise.allSettled(
      batch.map(async (album) => {
        let hydratedAlbum = album;

        if (
          album.leafCount === undefined ||
          album.duration === undefined ||
          album.releaseType === undefined
        ) {
          const metadata = await getMetadataByKey(
            buildMetadataKey(album.ratingKey),
          );

          if (metadata?.type === "album") {
            hydratedAlbum = metadata;
          }
        }

        if (
          hydratedAlbum.leafCount !== undefined &&
          hydratedAlbum.duration !== undefined &&
          hydratedAlbum.releaseType !== undefined
        ) {
          return hydratedAlbum;
        }
        return hydratedAlbum;
      }),
    );

    hydratedAlbums.push(
      ...results.map((result, offset) =>
        result.status === "fulfilled" ? result.value : batch[offset],
      ),
    );
  }

  return hydratedAlbums;
}

async function getClientIdentifier(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(CLIENT_IDENTIFIER_KEY);
  if (existing) {
    return existing;
  }

  const created = randomUUID();
  await LocalStorage.setItem(CLIENT_IDENTIFIER_KEY, created);
  return created;
}

async function nextCommandId(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(COMMAND_ID_KEY);
  const next = String(existing ? Number(existing) + 1 : Date.now());
  await LocalStorage.setItem(COMMAND_ID_KEY, next);
  return next;
}

function normalizeHeaders(
  extraHeaders?: RequestInit["headers"],
): Record<string, string> {
  if (!extraHeaders) {
    return {};
  }

  return Object.fromEntries(new Headers(extraHeaders).entries());
}

async function getBaseHeaders(
  extraHeaders?: RequestInit["headers"],
  token?: string,
): Promise<Record<string, string>> {
  const clientIdentifier = await getClientIdentifier();
  const extra = normalizeHeaders(extraHeaders);
  const headers: Record<string, string> = {
    Accept: "application/xml",
    "X-Plex-Client-Identifier": clientIdentifier,
    "X-Plex-Device-Name": `${environment.extensionName ?? "Raycast"} Controller`,
    "X-Plex-Product": environment.extensionName ?? "Raycast Plexamp",
    "X-Plex-Version": "0.1.0",
    "X-Plex-Platform":
      process.platform === "darwin" ? "macOS" : process.platform,
    "X-Plex-Provides": "controller",
    ...extra,
  };

  if (token) {
    headers["X-Plex-Token"] = token;
  }

  return headers;
}

async function requestXml(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  includeTokenQuery = false,
  token?: string,
): Promise<XmlNode> {
  const url = new URL(path, `${baseUrl}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  if (includeTokenQuery && token && !url.searchParams.has("X-Plex-Token")) {
    url.searchParams.set("X-Plex-Token", token);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: await getBaseHeaders(init?.headers, token),
      body: init?.body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const host = url.host || baseUrl;
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out after 15 seconds"
        : error instanceof Error
          ? error.message
          : String(error);

    if (baseUrl === getConfiguredPlexampUrl()) {
      throw new Error(
        `Could not reach Plexamp at ${getConfiguredPlexampUrl()}. Use the player's HTTP endpoint, usually http://<host>:32500, and verify ${getConfiguredPlexampUrl()}/resources loads from this Mac. Original error: ${message}`,
      );
    }

    throw new Error(
      `Could not reach Plex server at ${host}. Original error: ${message}`,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    clearTimeout(timeout);
    throw new Error(
      `Request failed (${response.status} ${response.statusText}): ${body || url.pathname}`,
    );
  }

  const text = await response.text();
  clearTimeout(timeout);
  return parseMediaContainer(text);
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const url = new URL(path, `${baseUrl}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;

  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        ...(await getBaseHeaders(init?.headers, token)),
        Accept: "application/json",
      },
      body: init?.body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out after 15 seconds"
        : error instanceof Error
          ? error.message
          : String(error);

    throw new Error(`Could not reach ${url.host}. Original error: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    clearTimeout(timeout);
    throw new Error(
      `Request failed (${response.status} ${response.statusText}): ${body || url.pathname}`,
    );
  }

  const data = (await response.json()) as T;
  clearTimeout(timeout);
  return data;
}

async function requestPlayer(
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<XmlNode> {
  const config = await getConfig();
  const url = new URL(path, `${config.plexampUrl}/`);
  const commandId = await nextCommandId();

  url.searchParams.set("commandID", commandId);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return requestXml(
    config.plexampUrl,
    url.pathname + url.search,
    undefined,
    false,
    config.plexToken,
  );
}

async function requestServer(
  path: string,
  init?: RequestInit,
): Promise<XmlNode> {
  const config = await requireServerConfig();
  return requestXml(
    config.plexServerUrl,
    path,
    init,
    true,
    config.plexServerToken ?? config.plexToken,
  );
}

function parsePlexampClientInfo(container: XmlNode): PlexampClientInfo {
  const baseUrl = new URL(getConfiguredPlexampUrl());
  const node =
    firstObject(container.Player) ??
    firstObject(container.Device) ??
    firstObject(container.Server) ??
    container;

  return {
    name:
      asString(node.title) ??
      asString(node.name) ??
      asString(node.deviceName) ??
      "Plexamp",
    product: asString(node.product),
    version: asString(node.version),
    platform: asString(node.platform),
    platformVersion: asString(node.platformVersion),
    deviceName:
      asString(node.deviceName) ?? asString(node.device) ?? asString(node.name),
    machineIdentifier:
      asString(node.machineIdentifier) ?? asString(node.clientIdentifier),
    address: asString(node.address) ?? baseUrl.hostname,
    port:
      asString(node.port) ??
      (baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80")),
    protocol: asString(node.protocol) ?? baseUrl.protocol.replace(":", ""),
  };
}

interface PlexPinResponse {
  id: number | string;
  code: string;
  authToken?: string;
  expiresIn?: number;
}

function buildPlexAuthUrl(code: string, clientIdentifier: string): string {
  const url = new URL("https://app.plex.tv/auth");
  const params = new URLSearchParams({
    clientID: clientIdentifier,
    code,
    forwardUrl: "https://app.plex.tv/desktop",
  });
  params.set(
    "context[device][product]",
    environment.extensionName ?? "Raycast Plexamp",
  );
  url.hash = `?${params.toString()}`;

  return url.toString();
}

function parsePlexServerConnection(node: XmlNode): PlexServerConnection {
  return {
    uri: requiredString(node.uri, "uri"),
    address: asString(node.address),
    port: asString(node.port),
    protocol: asString(node.protocol),
    local: asBoolean(node.local),
    relay: asBoolean(node.relay),
  };
}

function connectionRank(connection: PlexServerConnection): number {
  return [
    connection.relay ? 100 : 0,
    connection.local ? 0 : 10,
    connection.protocol === "https" ? 0 : 1,
  ].reduce((sum, value) => sum + value, 0);
}

function choosePreferredConnection(
  connections: PlexServerConnection[],
): PlexServerConnection | undefined {
  return [...connections].sort((left, right) => {
    const rankDifference = connectionRank(left) - connectionRank(right);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return left.uri.localeCompare(right.uri);
  })[0];
}

function parsePlexServerResource(
  node: XmlNode,
  fallbackToken: string,
): PlexServerResource | undefined {
  const provides = asString(node.provides) ?? "";

  if (
    !provides
      .split(",")
      .map((value) => value.trim())
      .includes("server")
  ) {
    return undefined;
  }

  const connections = arrayify(node.Connection)
    .filter(
      (connection): connection is XmlNode => typeof connection === "object",
    )
    .map(parsePlexServerConnection);

  if (connections.length === 0) {
    return undefined;
  }

  return {
    name:
      asString(node.name) ??
      asString(node.clientIdentifier) ??
      "Plex Media Server",
    product: asString(node.product),
    productVersion: asString(node.productVersion),
    platform: asString(node.platform),
    clientIdentifier: requiredString(node.clientIdentifier, "clientIdentifier"),
    accessToken: asString(node.accessToken) ?? fallbackToken,
    sourceTitle: asString(node.sourceTitle),
    owned: asBoolean(node.owned),
    connections,
    preferredConnection: choosePreferredConnection(connections),
  };
}

export async function createPlexAuthPin(): Promise<PlexAuthPin> {
  const clientIdentifier = await getClientIdentifier();
  const response = await requestJson<PlexPinResponse>(
    PLEX_TV_BASE_URL,
    "/api/v2/pins",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "strong=true",
    },
  );

  return {
    id: String(response.id),
    code: response.code,
    authUrl: buildPlexAuthUrl(response.code, clientIdentifier),
    expiresIn: response.expiresIn,
  };
}

export async function checkPlexAuthPin(
  pin: PlexAuthPin,
): Promise<string | undefined> {
  const response = await requestJson<PlexPinResponse>(
    PLEX_TV_BASE_URL,
    `/api/v2/pins/${encodeURIComponent(pin.id)}?code=${encodeURIComponent(pin.code)}`,
    undefined,
  );

  return response.authToken;
}

export async function discoverPlexServers(): Promise<PlexServerResource[]> {
  const token = await requirePlexToken();
  const container = await requestXml(
    PLEX_TV_BASE_URL,
    "/api/resources?includeHttps=1&includeIPv6=1",
    undefined,
    true,
    token,
  );

  return arrayify(container.Device)
    .filter((node): node is XmlNode => typeof node === "object")
    .map((node) => parsePlexServerResource(node, token))
    .filter((server): server is PlexServerResource => Boolean(server));
}

async function getServerIdentity(): Promise<ServerIdentity> {
  if (!serverIdentityPromise) {
    serverIdentityPromise = (async () => {
      const config = await requireServerConfig();
      const baseUrl = new URL(config.plexServerUrl);

      let machineIdentifier = config.serverMachineIdentifier;

      if (!machineIdentifier) {
        machineIdentifier = asString(
          (await requestServer("/")).machineIdentifier,
        );
      }

      if (!machineIdentifier) {
        machineIdentifier = asString(
          (await requestServer("/identity")).machineIdentifier,
        );
      }

      if (!machineIdentifier) {
        throw new Error("Unable to determine Plex server machine identifier.");
      }

      return {
        machineIdentifier,
        address: baseUrl.hostname,
        port: baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80"),
        protocol: baseUrl.protocol.replace(":", ""),
      };
    })();
  }

  return serverIdentityPromise;
}

function buildPlayableUri(
  machineIdentifier: string,
  item: PlayableItem,
): string {
  if (item.type === "playlist") {
    return "";
  }

  return `server://${machineIdentifier}/com.plexapp.plugins.library/library/metadata/${item.ratingKey}`;
}

function parsePlayQueue(container: XmlNode): PlayQueueInfo {
  const items = arrayify(container.Track)
    .filter((track): track is XmlNode => typeof track === "object")
    .map(parseTrack);
  const selectedItemID = asString(container.playQueueSelectedItemID);
  const selectedItem =
    items.find((item) => item.playQueueItemID === selectedItemID) ?? items[0];

  return {
    id: requiredString(container.playQueueID, "playQueueID"),
    version: asString(container.playQueueVersion),
    selectedItemID,
    selectedKey: selectedItem?.key,
    items,
  };
}

export async function getMusicSections(): Promise<LibrarySection[]> {
  const container = await requestServer("/library/sections");

  return arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .filter((node) => asString(node.type) === "artist")
    .map((node) => ({
      key: requiredString(node.key, "key"),
      title: requiredString(node.title, "title"),
      type: "artist" as const,
      totalSize: asNumber(node.totalSize),
    }));
}

export async function resolveSelectedLibrary(
  libraries: LibrarySection[],
): Promise<LibrarySection | undefined> {
  const { musicLibrary } = await getConfig();

  if (libraries.length === 0) {
    return undefined;
  }

  if (libraries.length === 1) {
    return libraries[0];
  }

  if (!musicLibrary) {
    return undefined;
  }

  const normalizedTarget = musicLibrary.toLowerCase();
  const selected = libraries.find((library) => {
    return (
      library.key === musicLibrary ||
      library.title.toLowerCase() === normalizedTarget
    );
  });

  if (!selected) {
    throw new Error(
      `Saved library selection "${musicLibrary}" was not found. Choose a different music library during setup.`,
    );
  }

  return selected;
}

export async function getSelectedLibrary(): Promise<
  LibrarySection | undefined
> {
  const libraries = await getMusicSections();
  return resolveSelectedLibrary(libraries);
}

export async function getPlexampClientInfo(): Promise<PlexampClientInfo> {
  const config = await getConfig();
  const container = await requestXml(
    config.plexampUrl,
    "/resources",
    undefined,
    false,
    config.plexToken,
  );
  return parsePlexampClientInfo(container);
}

export async function getLibraryStats(
  sectionKey: string,
): Promise<LibraryStats> {
  const [artistsContainer, albumsContainer, tracksContainer] =
    await Promise.all([
      requestServer(
        `/library/sections/${sectionKey}/all?type=8&X-Plex-Container-Start=0&X-Plex-Container-Size=1`,
      ),
      requestServer(
        `/library/sections/${sectionKey}/all?type=9&X-Plex-Container-Start=0&X-Plex-Container-Size=1`,
      ),
      requestServer(
        `/library/sections/${sectionKey}/all?type=10&X-Plex-Container-Start=0&X-Plex-Container-Size=1`,
      ),
    ]);

  return {
    artists:
      asNumber(artistsContainer.totalSize) ?? asNumber(artistsContainer.size),
    albums:
      asNumber(albumsContainer.totalSize) ?? asNumber(albumsContainer.size),
    tracks:
      asNumber(tracksContainer.totalSize) ?? asNumber(tracksContainer.size),
  };
}

async function playlistBelongsToSection(
  playlist: AudioPlaylist,
  sectionKey: string,
): Promise<boolean> {
  const container = await requestServer(
    `${playlist.browseKey}?X-Plex-Container-Start=0&X-Plex-Container-Size=1`,
  );
  const firstItem =
    arrayify(container.Metadata)[0] ?? arrayify(container.Track)[0];

  if (!firstItem || typeof firstItem !== "object") {
    return false;
  }

  return getLibrarySectionKey(firstItem as XmlNode) === sectionKey;
}

export async function getAudioPlaylists(
  sectionKey: string,
): Promise<AudioPlaylist[]> {
  const container = await requestServer("/playlists?playlistType=audio");
  const playlists = arrayify(container.Playlist)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parsePlaylist);

  const results = await Promise.allSettled(
    playlists.map(async (playlist) =>
      (await playlistBelongsToSection(playlist, sectionKey))
        ? playlist
        : undefined,
    ),
  );

  return results
    .map((result) => (result.status === "fulfilled" ? result.value : undefined))
    .filter((playlist): playlist is AudioPlaylist => Boolean(playlist));
}

export async function getArtists(sectionKey: string): Promise<MusicArtist[]> {
  const container = await requestServer(
    `/library/sections/${sectionKey}/all?type=8&sort=titleSort:asc`,
  );

  return arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseArtist);
}

export async function searchArtists(
  sectionKey: string,
  query: string,
): Promise<MusicArtist[]> {
  const container = await requestServer(
    `/library/sections/${sectionKey}/search?type=8&query=${encodeURIComponent(query)}`,
  );

  return arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseArtist);
}

export async function searchAlbums(
  sectionKey: string,
  query: string,
): Promise<MusicAlbum[]> {
  const container = await requestServer(
    `/library/sections/${sectionKey}/search?type=9&query=${encodeURIComponent(query)}`,
  );

  return arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseAlbum);
}

export async function searchTracks(
  sectionKey: string,
  query: string,
): Promise<MusicTrack[]> {
  const container = await requestServer(
    `/library/sections/${sectionKey}/search?type=10&query=${encodeURIComponent(query)}`,
  );

  return arrayify(container.Track)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseTrack);
}

export async function searchLibrary(
  sectionKey: string,
  query: string,
): Promise<SearchResults> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { tracks: [], albums: [], artists: [] };
  }

  const container = await requestServer(
    `/hubs/search?query=${encodeURIComponent(trimmedQuery)}&sectionId=${encodeURIComponent(sectionKey)}&limit=30&includeCollections=1&includeExternalMedia=0`,
  );
  const hubs = arrayify(container.Hub).filter(
    (node): node is XmlNode => typeof node === "object",
  );
  const tracks = hubs.flatMap((hub) =>
    arrayify(hub.Track)
      .filter((node): node is XmlNode => typeof node === "object")
      .map(parseTrack),
  );
  const directories = hubs.flatMap((hub) =>
    arrayify(hub.Directory).filter(
      (node): node is XmlNode => typeof node === "object",
    ),
  );
  const metadata = hubs.flatMap((hub) =>
    arrayify(hub.Metadata).filter(
      (node): node is XmlNode => typeof node === "object",
    ),
  );
  const albums = [
    ...directories
      .filter((node) => asString(node.type) === "album")
      .map(parseAlbum),
    ...metadata
      .filter((node) => asString(node.type) === "album")
      .map(parseAlbum),
  ];
  const artists = [
    ...directories
      .filter((node) => asString(node.type) === "artist")
      .map(parseArtist),
    ...metadata
      .filter((node) => asString(node.type) === "artist")
      .map(parseArtist),
  ];
  const hydratedAlbums = await hydrateAlbums(deduplicateByRatingKey(albums));

  return {
    tracks: deduplicateByRatingKey(tracks),
    albums: hydratedAlbums,
    artists: deduplicateByRatingKey(artists),
  };
}

export async function getAlbumsForArtist(
  sectionKey: string,
  artist: MusicArtist,
): Promise<MusicAlbum[]> {
  const container = await requestServer(
    `/library/sections/${sectionKey}/all?type=9&artist.id=${encodeURIComponent(artist.ratingKey)}`,
  );
  const albums = arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseAlbum);

  return hydrateAlbums(albums);
}

export async function getTracksForAlbum(
  album: MusicAlbum,
): Promise<MusicTrack[]> {
  const container = await requestServer(album.browseKey);

  return arrayify(container.Track)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseTrack);
}

export async function getTracksForPlaylist(
  playlist: AudioPlaylist,
): Promise<MusicTrack[]> {
  const container = await requestServer(playlist.browseKey);

  return arrayify(container.Track)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseTrack);
}

export async function getTimeline(): Promise<TimelineInfo> {
  const container = await requestPlayer("/player/timeline/poll", { wait: "0" });
  const timelines = arrayify(container.Timeline).filter(
    (node): node is XmlNode => typeof node === "object",
  );
  const musicTimeline =
    timelines.find((timeline) => asString(timeline.type) === "music") ??
    timelines[0];

  if (!musicTimeline) {
    return { state: "stopped" };
  }

  return {
    state: asString(musicTimeline.state) ?? "stopped",
    key: asString(musicTimeline.key),
    ratingKey: asString(musicTimeline.ratingKey),
    time: asNumber(musicTimeline.time),
    duration: asNumber(musicTimeline.duration),
    playQueueID: asString(musicTimeline.playQueueID),
    playQueueItemID: asString(musicTimeline.playQueueItemID),
    volume: asNumber(musicTimeline.volume),
    repeat: asString(musicTimeline.repeat),
    shuffle: asString(musicTimeline.shuffle),
  };
}

export async function getPlayQueue(
  playQueueId: string,
  options?: {
    window?: number;
    includeBefore?: number;
    includeAfter?: number;
  },
): Promise<PlayQueueInfo> {
  const params = new URLSearchParams({ own: "1" });

  if (options?.window !== undefined) {
    params.set("window", String(options.window));
  }

  if (options?.includeBefore !== undefined) {
    params.set("includeBefore", String(options.includeBefore));
  }

  if (options?.includeAfter !== undefined) {
    params.set("includeAfter", String(options.includeAfter));
  }

  try {
    const container = await requestServer(
      `/playQueues/${encodeURIComponent(playQueueId)}?${params.toString()}`,
    );
    return parsePlayQueue(container);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("400")) {
      throw error;
    }

    const fallbackContainer = await requestServer(
      `/playQueues/${encodeURIComponent(playQueueId)}?own=1`,
    );
    return parsePlayQueue(fallbackContainer);
  }
}

export async function getMetadataByKey(
  key: string,
): Promise<MetadataItem | undefined> {
  const container = await requestServer(key);
  return parseMetadataItem(container);
}

export async function getMetadataByRatingKey(
  ratingKey: string,
): Promise<MetadataItem | undefined> {
  return getMetadataByKey(buildMetadataKey(ratingKey));
}

async function createPlayQueue(item: PlayableItem): Promise<PlayQueueInfo> {
  const identity = await getServerIdentity();
  const params = new URLSearchParams({
    type: "audio",
    continuous: "1",
    repeat: "0",
    own: "1",
  });

  if (item.type === "playlist") {
    params.set("playlistID", item.ratingKey);
  } else {
    params.set("uri", buildPlayableUri(identity.machineIdentifier, item));
    params.set("key", item.key);
  }

  const container = await requestServer(`/playQueues?${params.toString()}`, {
    method: "POST",
  });
  return parsePlayQueue(container);
}

async function startPlayQueue(queue: PlayQueueInfo): Promise<void> {
  const config = await requireServerConfig();
  const identity = await getServerIdentity();
  const selectedKey = queue.selectedKey ?? queue.items[0]?.key;

  if (!selectedKey) {
    throw new Error("The created play queue did not include a playable track.");
  }

  await requestPlayer("/player/playback/playMedia", {
    machineIdentifier: identity.machineIdentifier,
    address: identity.address,
    port: identity.port,
    protocol: identity.protocol,
    token: config.plexServerToken ?? config.plexToken,
    key: selectedKey,
    containerKey: `/playQueues/${queue.id}?window=200&own=1`,
  });
}

async function addToPlayQueue(
  playQueueId: string,
  item: PlayableItem,
  next = false,
): Promise<void> {
  const identity = await getServerIdentity();
  const params = new URLSearchParams({ type: "audio" });

  if (next) {
    params.set("next", "1");
  }

  if (item.type === "playlist") {
    params.set("playlistID", item.ratingKey);
  } else {
    params.set("uri", buildPlayableUri(identity.machineIdentifier, item));
  }

  await requestServer(`/playQueues/${playQueueId}?${params.toString()}`, {
    method: "PUT",
  });
}

export async function playItem(item: PlayableItem): Promise<void> {
  const queue = await createPlayQueue(item);
  await startPlayQueue(queue);
}

export async function queueItem(item: PlayableItem): Promise<void> {
  const timeline = await getTimeline();

  if (timeline.playQueueID) {
    await addToPlayQueue(timeline.playQueueID, item);
    await refreshPlayQueue(timeline.playQueueID);
    return;
  }

  await playItem(item);
}

export async function playNextItem(item: PlayableItem): Promise<void> {
  const timeline = await getTimeline();

  if (timeline.playQueueID) {
    await addToPlayQueue(timeline.playQueueID, item, true);
    await refreshPlayQueue(timeline.playQueueID);
    return;
  }

  await playItem(item);
}

export async function refreshPlayQueue(playQueueId: string): Promise<void> {
  await requestPlayer("/player/playback/refreshPlayQueue", {
    type: "music",
    playQueueID: playQueueId,
  });
}

export async function removePlayQueueItem(
  playQueueId: string,
  playQueueItemId: string,
): Promise<void> {
  await requestServer(`/playQueues/${playQueueId}/items/${playQueueItemId}`, {
    method: "DELETE",
  });
  await refreshPlayQueue(playQueueId);
}

export async function clearPlayQueue(
  playQueueId: string,
  preservePlayQueueItemId?: string,
): Promise<void> {
  let selectedItemId = preservePlayQueueItemId;
  let iterations = 0;

  while (iterations < 100) {
    const queue = await getPlayQueue(playQueueId, {
      window: 10000,
      includeBefore: 10000,
      includeAfter: 10000,
    });
    selectedItemId = selectedItemId ?? queue.selectedItemID;

    if (!selectedItemId) {
      throw new Error(
        "Could not determine the current queue item to preserve.",
      );
    }

    const removableItemIds = queue.items
      .map((item) => item.playQueueItemID)
      .filter(
        (itemId): itemId is string =>
          Boolean(itemId) && itemId !== selectedItemId,
      );

    if (removableItemIds.length === 0) {
      await refreshPlayQueue(playQueueId);
      return;
    }

    for (const itemId of removableItemIds) {
      await requestServer(`/playQueues/${playQueueId}/items/${itemId}`, {
        method: "DELETE",
      });
    }

    await refreshPlayQueue(playQueueId);
    iterations += 1;
  }

  throw new Error("Could not clear the full queue after multiple passes.");
}

export async function movePlayQueueItem(
  playQueueId: string,
  playQueueItemId: string,
  afterPlayQueueItemId?: string,
): Promise<void> {
  const params = new URLSearchParams();

  if (afterPlayQueueItemId) {
    params.set("after", afterPlayQueueItemId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  await requestServer(
    `/playQueues/${playQueueId}/items/${playQueueItemId}/move${suffix}`,
    {
      method: "PUT",
    },
  );
  await refreshPlayQueue(playQueueId);
}

export async function playPause(): Promise<void> {
  await requestPlayer("/player/playback/playPause", { type: "music" });
}

export async function play(): Promise<void> {
  await requestPlayer("/player/playback/play", { type: "music" });
}

export async function pause(): Promise<void> {
  await requestPlayer("/player/playback/pause", { type: "music" });
}

export async function stop(): Promise<void> {
  await requestPlayer("/player/playback/stop", { type: "music" });
}

export async function skipNext(): Promise<void> {
  await requestPlayer("/player/playback/skipNext", { type: "music" });
}

export async function skipPrevious(): Promise<void> {
  await requestPlayer("/player/playback/skipPrevious", { type: "music" });
}

export async function skipToQueueItem(track: MusicTrack): Promise<void> {
  if (!track.playQueueItemID) {
    throw new Error("This track is missing a play queue item id.");
  }

  await requestPlayer("/player/playback/skipTo", {
    type: "music",
    key: track.key,
    playQueueItemID: track.playQueueItemID,
  });
}

export function getImageUrl(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }

  const baseUrl = cachedManagedConfig?.plexServerUrl;
  const token =
    cachedManagedConfig?.plexServerToken ?? cachedManagedConfig?.plexToken;

  if (!baseUrl || !token) {
    return undefined;
  }

  const url = new URL(path, `${baseUrl}/`);
  url.searchParams.set("X-Plex-Token", token);
  return url.toString();
}
