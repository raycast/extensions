import nacl from "tweetnacl";
import type {
  AuthSession,
  ChannelDefinition,
  Device,
  DeviceMetadata,
  EncryptedPendingMessage,
  PendingMessageRow,
  SecureBlobPayload,
  SecureDeviceState,
  SecureMessagingClientOptions,
  SecurePushInboxItem,
  SecurePushPayload,
  SendSecurePushFileOptions,
  SendSecurePushItemOptions,
  SendSecurePushResult,
} from "./types";

const SECURE_DEVICE_META_KEY = "secure-device";
const DEFAULT_CHANNEL_DEFINITIONS: Record<"push" | "blob", ChannelDefinition> = {
  push: {
    id: "push",
    persist_offline: true,
    default_ttl_seconds: 604800,
    max_message_size_bytes: 262144,
    description: "Small encrypted push payloads between the user devices",
  },
  blob: {
    id: "blob",
    persist_offline: true,
    default_ttl_seconds: 3600,
    max_message_size_bytes: 4096,
    description: "Encrypted blob references for secure file transfers",
  },
};
const DEFAULT_STALE_DEVICE_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;
// Items older than this are evicted regardless of TTL — guards against unbounded growth
// from items with no expires_at or far-future expiry.
const INBOX_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SECURE_PAYLOAD_SCHEMA_VERSION = 2;
const DEVICE_BOOTSTRAP_META_KEY = "secure-device-bootstrap-at";
const LOCAL_DATA_GENERATION_META_KEY = "local-data-generation";
const DEVICE_BOOTSTRAP_INTERVAL_MS = 60 * 1000;
const MAX_BLOB_DOWNLOAD_URL_LENGTH = 512;
const PENDING_MESSAGE_DELETE_BATCH_SIZE = 50;
const PENDING_MESSAGE_FETCH_LIMIT = 100;
const DEVICE_CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 15_000;
const BLOB_TRANSFER_TIMEOUT_MS = 120_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_BLOB_MIME_TYPES = new Set([
  "application/octet-stream",
  "application/pdf",
  "application/zip",
  "image/gif",
  "image/jpeg",
  "image/png",
  // SVG is only ever treated as an opaque image/file asset, never inlined.
  "image/svg+xml",
  "image/webp",
  "text/plain",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "video/mp4",
  "video/webm",
]);

function encodeBase64(bytes: Uint8Array): string {
  const bufferCtor = (
    globalThis as {
      Buffer?: {
        from(data: Uint8Array): { toString(encoding: string): string };
      };
    }
  ).Buffer;
  if (bufferCtor) return bufferCtor.from(bytes).toString("base64");
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const bufferCtor = (
    globalThis as {
      Buffer?: { from(data: string, encoding: string): Uint8Array };
    }
  ).Buffer;
  if (bufferCtor) return new Uint8Array(bufferCtor.from(value, "base64"));
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function resolveDeviceName(deviceName: string | (() => string)): string {
  return typeof deviceName === "function" ? deviceName() : deviceName;
}

function resolveDeviceMetadata(metadata: DeviceMetadata | (() => DeviceMetadata) | undefined): DeviceMetadata {
  return typeof metadata === "function" ? metadata() : (metadata ?? {});
}

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = nacl.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function createSecureDeviceState(): SecureDeviceState {
  const keyPair = nacl.box.keyPair();
  return {
    id: randomUuid(),
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

function encryptPayloadForRecipient<T>(payload: T, targetPublicKey: string, state: SecureDeviceState): string {
  const recipientPublicKey = decodeBase64(targetPublicKey);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const senderSecretKey = decodeBase64(state.secretKey);
  const ciphertext = nacl.box(plaintext, nonce, recipientPublicKey, senderSecretKey);
  return encodeBase64(concatBytes(nonce, ciphertext));
}

function decryptPayloadFromSender<T>(
  encryptedBase64: string,
  state: SecureDeviceState,
  senderPublicKey: string,
): T | null {
  const encrypted = decodeBase64(encryptedBase64);
  const nonce = encrypted.slice(0, nacl.box.nonceLength);
  const ciphertext = encrypted.slice(nacl.box.nonceLength);
  const receiverSecretKey = decodeBase64(state.secretKey);
  const senderPublicKeyBytes = decodeBase64(senderPublicKey);
  const plaintext = nacl.box.open(ciphertext, nonce, senderPublicKeyBytes, receiverSecretKey);
  if (!plaintext) return null;
  try {
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}

function encryptBlobBytes(bytes: Uint8Array, symmetricKey: Uint8Array): Uint8Array {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(bytes, nonce, symmetricKey);
  return concatBytes(nonce, ciphertext);
}

function decryptBlobBytes(encrypted: Uint8Array, symmetricKey: Uint8Array): Uint8Array | null {
  const nonce = encrypted.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = encrypted.slice(nacl.secretbox.nonceLength);
  return nacl.secretbox.open(ciphertext, nonce, symmetricKey);
}

function safeBlobMimeType(raw: string | null | undefined): string {
  const ct = raw?.trim().split(";")[0].trim().toLowerCase() ?? "";
  return ALLOWED_BLOB_MIME_TYPES.has(ct) ? ct : "application/octet-stream";
}

function toSafeHeaderValue(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "_")
      .trim()
      .slice(0, 200) || "secure-file"
  );
}

function isFreshSecureTarget(device: Pick<Device, "last_seen_at">, staleWindowMs: number): boolean {
  const lastSeenAt = Date.parse(device.last_seen_at);
  return Number.isFinite(lastSeenAt) && Date.now() - lastSeenAt <= staleWindowMs;
}

function resolveTtlSeconds(ttlHours: number | undefined, defaultTtlSeconds: number): number {
  if (typeof ttlHours !== "number" || Number.isNaN(ttlHours)) {
    return defaultTtlSeconds;
  }
  if (ttlHours <= 0) {
    return defaultTtlSeconds;
  }
  return Math.max(1, Math.round(ttlHours * 3600));
}

function normalizeRelayDownloadUrl(downloadUrl: string, relayUrl: string): string {
  try {
    const url = new URL(downloadUrl);
    const relayBase = new URL(relayUrl);
    const relayIsLocal =
      relayBase.hostname === "127.0.0.1" || relayBase.hostname === "localhost" || relayBase.hostname === "10.0.2.2";
    const sourceIsLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "10.0.2.2";
    const shouldRewrite = sourceIsLocal || (relayIsLocal && url.pathname.startsWith("/blob/"));
    if (!shouldRewrite) return downloadUrl;
    url.protocol = relayBase.protocol;
    url.hostname = relayBase.hostname;
    url.port = relayBase.port;
    return url.toString();
  } catch {
    return downloadUrl;
  }
}

function isRelayBlobDownloadUrl(downloadUrl: string, relayUrl: string): boolean {
  try {
    const relayOrigin = new URL(relayUrl).origin;
    const download = new URL(downloadUrl);
    return (
      download.origin === relayOrigin &&
      /^\/blob\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(download.pathname)
    );
  } catch {
    return false;
  }
}

function toSecureInboxItem(args: {
  id: string;
  channel: "push" | "blob";
  content: string;
  contentType?: string;
  title: string | null;
  sourceDevice: string | null;
  senderDeviceId: string;
  targetDeviceId: string | null;
  createdAt: string;
  expiresAt: string | null;
  direction: "incoming" | "outgoing";
  metadata?: Record<string, string>;
}): SecurePushInboxItem {
  return {
    id: args.id,
    channel: args.channel,
    content: args.content,
    content_type: args.contentType ?? "text/plain",
    title: args.title,
    source_device: args.sourceDevice,
    target_device_id: args.targetDeviceId,
    is_read: false,
    expires_at: args.expiresAt,
    created_at: args.createdAt,
    metadata: {
      transport: "secure",
      direction: args.direction,
      sender_device_id: args.senderDeviceId,
      ...(args.metadata ?? {}),
    },
    transport: "secure",
    direction: args.direction,
    sender_device_id: args.senderDeviceId,
  };
}

function isExpiredInboxItem(item: Pick<SecurePushInboxItem, "expires_at" | "created_at">): boolean {
  // Max-age cap: evict items older than INBOX_MAX_AGE_MS regardless of their TTL.
  const createdAt = Date.parse(item.created_at);
  if (Number.isFinite(createdAt) && Date.now() - createdAt >= INBOX_MAX_AGE_MS) {
    return true;
  }
  if (!item.expires_at) return false;
  const expiresAt = Date.parse(item.expires_at);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function isSupportedPayloadSchemaVersion(version: number): boolean {
  return version === SECURE_PAYLOAD_SCHEMA_VERSION;
}

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// Keep in sync with fetchWithTimeout in ../fetch.ts.
// Intentional difference: this copy defaults timeoutMs to FETCH_TIMEOUT_MS;
// the raycast-extension copy requires it explicitly.
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Fetch timed out after ${timeoutMs} ms`, "TimeoutError")),
    timeoutMs,
  );
  // Forward an existing caller signal into our controller so both the timeout
  // and any external cancellation can abort the request.
  let forward: (() => void) | undefined;
  if (options.signal) {
    forward = () => controller.abort((options.signal as AbortSignal).reason);
    options.signal.addEventListener("abort", forward, { once: true });
    // If the signal was already aborted before we attached the listener,
    // addEventListener won't fire it — propagate the reason immediately.
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    }
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (options.signal && forward) {
      options.signal.removeEventListener("abort", forward);
    }
  }
}

export function createSecureMessagingClient<BlobHandle = unknown>(options: SecureMessagingClientOptions<BlobHandle>) {
  async function parseErrorBody(response: Response): Promise<string> {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as {
        code?: string;
        message?: string;
      };
      if (response.status === 401 || response.status === 403 || parsed.code === "42501") {
        const message = parsed.message?.toLowerCase() ?? "";
        if (message.includes('table "devices"')) {
          return options.upgradeMessage ?? "Upgrade to Cloud Pro to use Nibit Push.";
        }
      }
    } catch {
      // Fall through to the raw body when the response is not structured JSON.
    }
    return body || `Request failed (${response.status})`;
  }

  const staleWindowMs = options.staleDeviceWindowMs ?? DEFAULT_STALE_DEVICE_WINDOW_MS;
  const apiBaseUrl = options.apiBaseUrl?.replace(/\/+$/, "") ?? null;
  let secureDeviceStatePromise: Promise<SecureDeviceState> | null = null;
  let cachedDevicesPromise: Promise<Device[]> | null = null;
  let cachedDevicesExpiresAt = 0;
  let inboxIngestionQueue: Promise<void> = Promise.resolve();
  let localDataGeneration = 0;

  type LocalDataGenerationSnapshot = {
    local: number;
    persisted: number;
  };

  function invalidateDeviceCache() {
    cachedDevicesPromise = null;
    cachedDevicesExpiresAt = 0;
  }

  class LocalDataClearedError extends Error {
    constructor() {
      super("Local secure data was cleared while inbox ingestion was running");
    }
  }

  function assertLocalDataGeneration(generation: number): void {
    if (generation !== localDataGeneration) throw new LocalDataClearedError();
  }

  async function readPersistedLocalDataGeneration(): Promise<number> {
    try {
      const value = await options.store.readMetaValue<number>(LOCAL_DATA_GENERATION_META_KEY);
      return typeof value === "number" && Number.isFinite(value) ? value : 0;
    } catch {
      // Corrupt metadata must not prevent sign-out/local wipe from clearing decrypted data.
      return 0;
    }
  }

  async function assertLocalDataGenerationSnapshot(generation: LocalDataGenerationSnapshot): Promise<void> {
    assertLocalDataGeneration(generation.local);
    if ((await readPersistedLocalDataGeneration()) !== generation.persisted) throw new LocalDataClearedError();
  }

  function serializeInboxIngestion<T>(
    operation: (generation: LocalDataGenerationSnapshot) => Promise<T>,
    clearedValue: () => Promise<T>,
  ): Promise<T> {
    // Capture the in-memory epoch before any async boundary. Otherwise a
    // concurrent clearUserData() could advance both local and persisted epochs
    // before readPersistedLocalDataGeneration() resolves, aliasing this sync to
    // the post-clear generation instead of detecting the clear.
    const snapshotLocalGeneration = localDataGeneration;
    const generationPromise = readPersistedLocalDataGeneration().then((persisted) => ({
      local: snapshotLocalGeneration,
      persisted,
    }));
    const run = inboxIngestionQueue
      .catch(() => undefined)
      .then(async () => {
        const generation = await generationPromise;
        await assertLocalDataGenerationSnapshot(generation);
        return await operation(generation);
      })
      .catch(async (error) => {
        if (error instanceof LocalDataClearedError) return await clearedValue();
        throw error;
      });
    inboxIngestionQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function requireSession(): Promise<AuthSession> {
    const session = await options.sessionProvider.getSession();
    if (!session?.userId || !session.accessToken) {
      throw new Error("Not signed in");
    }
    return session;
  }

  function restHeaders(accessToken: string): HeadersInit {
    return {
      apikey: options.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  function apiHeaders(accessToken: string): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  function apiBaseUrlFor(session: AuthSession): string | null {
    return apiBaseUrl && session.authType === "api_key" ? apiBaseUrl : null;
  }

  async function getOrCreateSecureDeviceState(): Promise<SecureDeviceState> {
    if (!secureDeviceStatePromise) {
      secureDeviceStatePromise = (async () => {
        const existing = await options.store.readMetaValue<SecureDeviceState>(SECURE_DEVICE_META_KEY);
        if (existing) return existing;
        const next = createSecureDeviceState();
        await options.store.writeMetaValue(SECURE_DEVICE_META_KEY, next);
        return next;
      })();
    }
    try {
      return await secureDeviceStatePromise;
    } finally {
      secureDeviceStatePromise = null;
    }
  }

  async function bootstrapDevice(): Promise<SecureDeviceState | null> {
    const session = await options.sessionProvider.getSession();
    if (!session) return null;
    const state = await getOrCreateSecureDeviceState();
    const lastBootstrapAt = await options.store.readMetaValue<number>(DEVICE_BOOTSTRAP_META_KEY);
    if (typeof lastBootstrapAt === "number" && Date.now() - lastBootstrapAt < DEVICE_BOOTSTRAP_INTERVAL_MS) {
      return state;
    }
    const now = new Date().toISOString();
    const payload = {
      id: state.id,
      user_id: session.userId,
      device_name: resolveDeviceName(options.deviceName),
      device_type: options.deviceType,
      public_key: state.publicKey,
      capabilities: options.deviceCapabilities,
      metadata: resolveDeviceMetadata(options.deviceMetadata),
      is_active: true,
      last_seen_at: now,
      last_synced_at: now,
      sync_version: 1,
    };
    const { accessToken } = session;
    const apiUrl = apiBaseUrlFor(session);
    async function doBootstrapUpsert() {
      if (apiUrl) {
        return fetchWithTimeout(`${apiUrl}/v1/devices/register`, {
          method: "POST",
          headers: apiHeaders(accessToken),
          body: JSON.stringify(payload),
        });
      }
      return fetchWithTimeout(`${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/devices?on_conflict=id`, {
        method: "POST",
        headers: {
          ...restHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(payload),
      });
    }

    const response = await doBootstrapUpsert();
    if (!response.ok) {
      const isRetryable = response.status === 403 && options.onBootstrapForbidden;
      if (isRetryable) {
        await options.onBootstrapForbidden!();
        const retryResponse = await doBootstrapUpsert();
        if (!retryResponse.ok) {
          throw new Error(await parseErrorBody(retryResponse));
        }
        await options.store.writeMetaValue(DEVICE_BOOTSTRAP_META_KEY, Date.now());
        return state;
      }
      throw new Error(await parseErrorBody(response));
    }
    await options.store.writeMetaValue(DEVICE_BOOTSTRAP_META_KEY, Date.now());
    return state;
  }

  async function readSecureDeviceId(): Promise<string | null> {
    const state = await options.store.readMetaValue<SecureDeviceState>(SECURE_DEVICE_META_KEY);
    return state?.id ?? null;
  }

  async function fetchSecureDevices(): Promise<Device[]> {
    const session = await requireSession();
    const params = new URLSearchParams({
      select: "*",
      user_id: `eq.${session.userId}`,
      is_active: "eq.true",
      order: "last_seen_at.desc",
    });
    const apiUrl = apiBaseUrlFor(session);
    const response = apiUrl
      ? await fetchWithTimeout(`${apiUrl}/v1/devices`, { headers: apiHeaders(session.accessToken) })
      : await fetchWithTimeout(`${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/devices?${params.toString()}`, {
          headers: restHeaders(session.accessToken),
        });
    if (!response.ok) throw new Error(await parseErrorBody(response));
    const body = await response.json();
    return apiUrl ? (body as { devices: Device[] }).devices : (body as Device[]);
  }

  async function fetchSecureDevicesWithCache(): Promise<Device[]> {
    if (cachedDevicesPromise && Date.now() < cachedDevicesExpiresAt) {
      return cachedDevicesPromise;
    }
    cachedDevicesExpiresAt = Date.now() + DEVICE_CACHE_TTL_MS;
    const p: Promise<Device[]> = fetchSecureDevices().catch((err) => {
      if (cachedDevicesPromise === p) {
        invalidateDeviceCache();
      }
      throw err;
    });
    cachedDevicesPromise = p;
    return p;
  }

  async function fetchChannelDefinition(id: "push" | "blob"): Promise<ChannelDefinition> {
    const session = await requireSession();
    const params = new URLSearchParams({
      select: "*",
      id: `eq.${id}`,
      limit: "1",
    });
    const apiUrl = apiBaseUrlFor(session);
    const response = apiUrl
      ? await fetchWithTimeout(`${apiUrl}/v1/channel-definitions/${id}`, { headers: apiHeaders(session.accessToken) })
      : await fetchWithTimeout(
          `${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/channel_definitions?${params.toString()}`,
          { headers: restHeaders(session.accessToken) },
        );
    if (!response.ok) return DEFAULT_CHANNEL_DEFINITIONS[id];
    const data = await response.json();
    return apiUrl
      ? (data as { channel: ChannelDefinition }).channel
      : ((data as ChannelDefinition[])[0] ?? DEFAULT_CHANNEL_DEFINITIONS[id]);
  }

  async function listSecurePushItems(): Promise<SecurePushInboxItem[]> {
    const items = await options.store.listInboxItems();
    const expired = items.filter(isExpiredInboxItem);
    if (expired.length === 0) return items;
    await Promise.all(
      expired.map(async (item) => {
        await options.store.deleteBlobValue(item.id);
        await options.store.deleteInboxItem(item.id);
      }),
    );
    return items.filter((item) => !isExpiredInboxItem(item));
  }

  async function deleteSecurePushItem(id: string): Promise<void> {
    await options.store.deleteBlobValue(id);
    await options.store.deleteInboxItem(id);
  }

  async function clearSecurePushItems(): Promise<void> {
    await options.store.clearBlobStore();
    await options.store.clearInboxStore();
  }

  async function getStoredBlob(id: string): Promise<BlobHandle | null> {
    return options.store.readBlobValue(id);
  }

  async function sendSecurePushItem(
    content: string,
    sendOptions: SendSecurePushItemOptions = {},
  ): Promise<SendSecurePushResult> {
    try {
      const session = await requireSession();
      const state = await bootstrapDevice();
      if (!state) return { error: "Not signed in" };
      const payload: SecurePushPayload = {
        kind: sendOptions.kind ?? "text",
        content,
        title: sendOptions.title ?? null,
      };
      const channel = await fetchChannelDefinition("push");
      const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
      if (encodedPayload.byteLength > channel.max_message_size_bytes) {
        return { error: "Secure message exceeds the configured size limit." };
      }
      const devices = await fetchSecureDevicesWithCache();
      const targets = devices.filter((device) => {
        if (!device.public_key || device.id === state.id) return false;
        if (sendOptions.targetDeviceId) return device.id === sendOptions.targetDeviceId;
        return (device.capabilities ?? []).includes("push_receive") && isFreshSecureTarget(device, staleWindowMs);
      });
      if (targets.length === 0) return { error: "No target devices available for secure push." };
      const ttlSeconds = resolveTtlSeconds(sendOptions.ttlHours, channel.default_ttl_seconds);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
      const rows = targets.map((target) => ({
        id: randomUuid(),
        user_id: session.userId,
        target_device_id: target.id,
        channel: "push",
        message_type: payload.kind,
        sender_device_id: state.id,
        encrypted_payload: encryptPayloadForRecipient(payload, target.public_key as string, state),
        requires_auth: false,
        payload_schema_version: SECURE_PAYLOAD_SCHEMA_VERSION,
        created_at: now.toISOString(),
        expires_at: expiresAt,
      }));
      const response = await fetchWithTimeout(
        apiBaseUrlFor(session)
          ? `${apiBaseUrlFor(session)}/v1/pending-messages`
          : `${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/pending_messages`,
        {
          method: "POST",
          headers: apiBaseUrlFor(session)
            ? apiHeaders(session.accessToken)
            : {
                ...restHeaders(session.accessToken),
                Prefer: "return=minimal",
              },
          body: JSON.stringify(rows),
        },
      );
      if (!response.ok) return { error: await parseErrorBody(response) };
      await options.store.upsertInboxItem(
        toSecureInboxItem({
          id: `local:${randomUuid()}`,
          channel: "push",
          content,
          title: sendOptions.title ?? null,
          sourceDevice: resolveDeviceName(options.deviceName),
          senderDeviceId: state.id,
          targetDeviceId: sendOptions.targetDeviceId ?? null,
          createdAt: now.toISOString(),
          expiresAt,
          direction: "outgoing",
        }),
      );
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to send secure push.",
      };
    }
  }

  async function sendSecurePushFile(
    bytes: Uint8Array,
    sendOptions: SendSecurePushFileOptions = {},
  ): Promise<SendSecurePushResult> {
    try {
      const session = await requireSession();
      const state = await bootstrapDevice();
      if (!state) return { error: "Not signed in" };
      const channel = await fetchChannelDefinition("blob");
      const devices = await fetchSecureDevicesWithCache();
      const targets = devices.filter((device) => {
        if (!device.public_key || device.id === state.id) return false;
        if (sendOptions.targetDeviceId) return device.id === sendOptions.targetDeviceId;
        return (device.capabilities ?? []).includes("blob_receive") && isFreshSecureTarget(device, staleWindowMs);
      });
      if (targets.length === 0) return { error: "No target devices available for secure file push." };
      const fileName = sendOptions.fileName?.trim() || "secure-file";
      const mimeType = safeBlobMimeType(sendOptions.mimeType);
      const symmetricKey = nacl.randomBytes(nacl.secretbox.keyLength);
      const payload: SecureBlobPayload = {
        download_url: `${options.blobRelayUrl.replace(/\/+$/, "")}/blob/${"x".repeat(MAX_BLOB_DOWNLOAD_URL_LENGTH)}`,
        symmetric_key: encodeBase64(symmetricKey),
        filename: fileName,
        mime_type: mimeType,
        size_bytes: bytes.byteLength,
      };
      const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
      if (encodedPayload.byteLength > channel.max_message_size_bytes) {
        return {
          error: "Secure file envelope exceeds the configured size limit.",
        };
      }
      const encryptedBlob = encryptBlobBytes(bytes, symmetricKey);
      const uploadResponse = await fetchWithTimeout(
        `${options.blobRelayUrl.replace(/\/+$/, "")}/blob`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/octet-stream",
            "X-Blob-Ttl-Seconds": String(resolveTtlSeconds(sendOptions.ttlHours, channel.default_ttl_seconds)),
            "X-Blob-Max-Downloads": String(targets.length),
            "X-Blob-Filename": toSafeHeaderValue(fileName),
          },
          body: toArrayBuffer(encryptedBlob),
        },
        BLOB_TRANSFER_TIMEOUT_MS,
      );
      if (!uploadResponse.ok) {
        return {
          error: (await uploadResponse.text()) || "Unable to upload secure blob.",
        };
      }
      const upload = (await uploadResponse.json()) as {
        id: string;
        download_url: string;
      };
      payload.download_url = upload.download_url;
      const finalEncodedPayload = new TextEncoder().encode(JSON.stringify(payload));
      if (finalEncodedPayload.byteLength > channel.max_message_size_bytes) {
        const blobId = isUuid(upload.id) ? upload.id : null;
        if (blobId) {
          void fetch(`${options.blobRelayUrl.replace(/\/+$/, "")}/blob/${blobId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }).catch((error) => {
            console.warn(
              `[SecureMessaging] Failed to delete oversized relay blob ${upload.download_url}: ${
                error instanceof Error ? error.message : "unknown error"
              }`,
            );
          });
        }
        console.warn(
          `[SecureMessaging] Uploaded blob exceeds envelope limit after relay URL resolution: ${upload.download_url}`,
        );
        return {
          error: "Secure file envelope exceeds the configured size limit after blob upload.",
        };
      }
      const ttlSeconds = resolveTtlSeconds(sendOptions.ttlHours, channel.default_ttl_seconds);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
      const rows = targets.map((target) => ({
        id: randomUuid(),
        user_id: session.userId,
        target_device_id: target.id,
        channel: "blob",
        message_type: "file_ref",
        sender_device_id: state.id,
        encrypted_payload: encryptPayloadForRecipient(payload, target.public_key as string, state),
        requires_auth: false,
        payload_schema_version: SECURE_PAYLOAD_SCHEMA_VERSION,
        created_at: now.toISOString(),
        expires_at: expiresAt,
      }));
      const response = await fetchWithTimeout(
        apiBaseUrlFor(session)
          ? `${apiBaseUrlFor(session)}/v1/pending-messages`
          : `${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/pending_messages`,
        {
          method: "POST",
          headers: apiBaseUrlFor(session)
            ? apiHeaders(session.accessToken)
            : {
                ...restHeaders(session.accessToken),
                Prefer: "return=minimal",
              },
          body: JSON.stringify(rows),
        },
      );
      if (!response.ok) {
        const errorBody = await parseErrorBody(response);
        const blobId = isUuid(upload.id) ? upload.id : null;
        if (blobId) {
          void fetch(`${options.blobRelayUrl.replace(/\/+$/, "")}/blob/${blobId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }).catch((error) => {
            console.warn(
              `[SecureMessaging] Failed to delete orphaned relay blob ${upload.download_url}: ${
                error instanceof Error ? error.message : "unknown error"
              }`,
            );
          });
        }
        console.warn(
          `[SecureMessaging] Uploaded blob without pending_messages row: ${upload.download_url} (targets=${targets.length}, sender=${state.id}, error=${errorBody})`,
        );
        return { error: errorBody };
      }
      const echoId = `local:${randomUuid()}`;
      await options.store.writeBlobValue(echoId, bytes, mimeType, fileName, expiresAt);
      await options.store.upsertInboxItem(
        toSecureInboxItem({
          id: echoId,
          channel: "blob",
          content: `secure-blob:${echoId}`,
          contentType: mimeType,
          title: fileName,
          sourceDevice: resolveDeviceName(options.deviceName),
          senderDeviceId: state.id,
          targetDeviceId: sendOptions.targetDeviceId ?? null,
          createdAt: now.toISOString(),
          expiresAt,
          direction: "outgoing",
          metadata: {
            file_name: fileName,
            file_size: String(bytes.byteLength),
          },
        }),
      );
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to send secure file.",
      };
    }
  }

  async function downloadSecureBlob(
    payload: SecureBlobPayload,
  ): Promise<
    { status: "success"; bytes: Uint8Array } | { status: "permanent_failure" } | { status: "retryable_failure" }
  > {
    const normalizedUrl = normalizeRelayDownloadUrl(payload.download_url, options.blobRelayUrl);
    if (!isRelayBlobDownloadUrl(normalizedUrl, options.blobRelayUrl)) return { status: "permanent_failure" };
    let session: AuthSession;
    try {
      session = await requireSession();
    } catch {
      return { status: "permanent_failure" };
    }
    try {
      const response = await fetchWithTimeout(
        normalizedUrl,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
        BLOB_TRANSFER_TIMEOUT_MS,
      );
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) {
          return { status: "permanent_failure" };
        }
        return { status: "retryable_failure" };
      }
      const encrypted = new Uint8Array(await response.arrayBuffer());
      const decrypted = decryptBlobBytes(encrypted, decodeBase64(payload.symmetric_key));
      if (!decrypted) return { status: "permanent_failure" };
      return { status: "success", bytes: decrypted };
    } catch {
      return { status: "retryable_failure" };
    }
  }

  type DeviceWithPublicKey = Device & { public_key: string };

  type SenderDeviceResolver = {
    getSender(row: EncryptedPendingMessage): Promise<DeviceWithPublicKey | null>;
  };

  function createSenderDeviceResolver(devices: Device[]): SenderDeviceResolver {
    let deviceMap = new Map(devices.map((device) => [device.id, device]));
    let didRefreshDevices = false;
    return {
      async getSender(row) {
        let sender = deviceMap.get(row.sender_device_id);
        if (!sender?.public_key && !didRefreshDevices) {
          // Sender not in cached device list — may have registered within the
          // cache TTL window. Refetch once before giving up.
          invalidateDeviceCache();
          const fresh = await fetchSecureDevicesWithCache();
          deviceMap = new Map(fresh.map((device) => [device.id, device]));
          didRefreshDevices = true;
          sender = deviceMap.get(row.sender_device_id);
        }
        return sender?.public_key ? (sender as DeviceWithPublicKey) : null;
      },
    };
  }

  async function ingestPushRow(
    row: EncryptedPendingMessage,
    state: SecureDeviceState,
    sender: DeviceWithPublicKey,
    generation: LocalDataGenerationSnapshot,
  ): Promise<"delivered"> {
    const payload = decryptPayloadFromSender<SecurePushPayload>(row.encrypted_payload, state, sender.public_key);
    if (!payload) {
      console.warn(`[SecureMessaging] Dropping undecipherable push ${row.id}; payload could not be decrypted`);
      return "delivered";
    }
    await assertLocalDataGenerationSnapshot(generation);
    const item = toSecureInboxItem({
      id: row.id,
      channel: "push",
      content: payload.content,
      title: payload.title,
      sourceDevice: sender.display_name ?? sender.device_name,
      senderDeviceId: row.sender_device_id,
      targetDeviceId: row.target_device_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      direction: "incoming",
    });
    await options.store.upsertInboxItem(item);
    try {
      await assertLocalDataGenerationSnapshot(generation);
    } catch (error) {
      await options.store.deleteInboxItem(row.id).catch(() => undefined);
      throw error;
    }
    return "delivered";
  }

  async function ingestBlobRow(
    row: EncryptedPendingMessage,
    state: SecureDeviceState,
    sender: DeviceWithPublicKey,
    generation: LocalDataGenerationSnapshot,
  ): Promise<"delivered" | "retry_later"> {
    const payload = decryptPayloadFromSender<SecureBlobPayload>(row.encrypted_payload, state, sender.public_key);
    if (!payload) {
      console.warn(`[SecureMessaging] Dropping undecipherable blob ${row.id}; payload could not be decrypted`);
      return "delivered";
    }
    const blobDownload = await downloadSecureBlob(payload);
    if (blobDownload.status === "retryable_failure") return "retry_later";
    if (blobDownload.status === "permanent_failure") {
      console.warn(`[SecureMessaging] Dropping blob ${row.id}; ciphertext is no longer retrievable`);
      return "delivered";
    }
    await assertLocalDataGenerationSnapshot(generation);
    await options.store.writeBlobValue(row.id, blobDownload.bytes, payload.mime_type, payload.filename, row.expires_at);
    try {
      await assertLocalDataGenerationSnapshot(generation);
    } catch (error) {
      await options.store.deleteBlobValue(row.id).catch(() => undefined);
      throw error;
    }
    const item = toSecureInboxItem({
      id: row.id,
      channel: "blob",
      content: `secure-blob:${row.id}`,
      contentType: payload.mime_type,
      title: payload.filename,
      sourceDevice: sender.display_name ?? sender.device_name,
      senderDeviceId: row.sender_device_id,
      targetDeviceId: row.target_device_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      direction: "incoming",
      metadata: {
        file_name: payload.filename,
        file_size: String(payload.size_bytes),
      },
    });
    await options.store.upsertInboxItem(item);
    try {
      await assertLocalDataGenerationSnapshot(generation);
    } catch (error) {
      await Promise.all([
        options.store.deleteInboxItem(row.id).catch(() => undefined),
        options.store.deleteBlobValue(row.id).catch(() => undefined),
      ]);
      throw error;
    }
    return "delivered";
  }

  async function deleteDeliveredPendingMessages(
    ids: string[],
    session: AuthSession,
    generation: LocalDataGenerationSnapshot,
  ): Promise<void> {
    for (let index = 0; index < ids.length; index += PENDING_MESSAGE_DELETE_BATCH_SIZE) {
      await assertLocalDataGenerationSnapshot(generation);
      const chunk = ids.slice(index, index + PENDING_MESSAGE_DELETE_BATCH_SIZE);
      if (!chunk.every(isUuid)) {
        throw new Error("Invalid pending message id in delete batch.");
      }
      // Safe because pending message ids are asserted UUIDs before interpolation.
      const deleteParams = new URLSearchParams({
        id: `in.(${chunk.join(",")})`,
      });
      const deleteResponse = await fetchWithTimeout(
        apiBaseUrlFor(session)
          ? `${apiBaseUrlFor(session)}/v1/pending-messages/delete`
          : `${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/pending_messages?${deleteParams.toString()}`,
        {
          method: apiBaseUrlFor(session) ? "POST" : "DELETE",
          headers: apiBaseUrlFor(session)
            ? apiHeaders(session.accessToken)
            : {
                ...restHeaders(session.accessToken),
                Prefer: "return=minimal",
              },
          body: apiBaseUrlFor(session) ? JSON.stringify({ ids: chunk }) : undefined,
        },
      );
      if (!deleteResponse.ok) throw new Error(await parseErrorBody(deleteResponse));
      await assertLocalDataGenerationSnapshot(generation);
    }
  }

  async function processPendingMessageRows(
    rows: EncryptedPendingMessage[],
    state: SecureDeviceState,
    session: AuthSession,
    devices: Device[],
    localItems: SecurePushInboxItem[],
    generation: LocalDataGenerationSnapshot,
  ): Promise<SecurePushInboxItem[]> {
    await assertLocalDataGenerationSnapshot(generation);
    const senderResolver = createSenderDeviceResolver(devices);
    const localIdSet = new Set(localItems.map((item) => item.id));
    const deliveredIds: string[] = [];
    for (const row of rows) {
      await assertLocalDataGenerationSnapshot(generation);
      if (!isSupportedPayloadSchemaVersion(row.payload_schema_version)) {
        console.warn(
          `[SecureMessaging] Skipping unsupported payload schema version ${row.payload_schema_version} for pending message ${row.id}`,
        );
        deliveredIds.push(row.id);
        continue;
      }
      if (localIdSet.has(row.id)) {
        deliveredIds.push(row.id);
        continue;
      }
      if (row.channel !== "push" && row.channel !== "blob") {
        console.warn(`[SecureMessaging] Dropping unsupported channel ${row.channel} for pending message ${row.id}`);
        deliveredIds.push(row.id);
        continue;
      }
      const sender = await senderResolver.getSender(row);
      if (!sender) {
        console.warn(
          `[SecureMessaging] Dropping undeliverable ${row.channel} ${row.id}; sender device ${row.sender_device_id} is unavailable`,
        );
        deliveredIds.push(row.id);
        continue;
      }
      const status =
        row.channel === "push"
          ? await ingestPushRow(row, state, sender, generation)
          : await ingestBlobRow(row, state, sender, generation);
      if (status === "delivered") deliveredIds.push(row.id);
    }
    await assertLocalDataGenerationSnapshot(generation);
    if (deliveredIds.length > 0) await deleteDeliveredPendingMessages(deliveredIds, session, generation);
    await assertLocalDataGenerationSnapshot(generation);
    return listSecurePushItems();
  }

  async function ingestEncryptedPendingMessages(messages: EncryptedPendingMessage[]): Promise<SecurePushInboxItem[]> {
    return serializeInboxIngestion(
      async (generation) => {
        const state = await bootstrapDevice();
        const session = await options.sessionProvider.getSession();
        if (!state || !session) return listSecurePushItems();
        const [devices, localItems] = await Promise.all([
          fetchSecureDevicesWithCache(),
          options.store.listInboxItems(),
        ]);
        return processPendingMessageRows(messages, state, session, devices, localItems, generation);
      },
      async () => [],
    );
  }

  async function syncSecurePushInbox(): Promise<SecurePushInboxItem[]> {
    return serializeInboxIngestion(
      async (generation) => {
        const state = await bootstrapDevice();
        const session = await options.sessionProvider.getSession();
        if (!state || !session) return listSecurePushItems();
        const params = new URLSearchParams({
          select: "*",
          user_id: `eq.${session.userId}`,
          target_device_id: `eq.${state.id}`,
          expires_at: `gt.${new Date().toISOString()}`,
          order: "created_at.desc",
          limit: String(PENDING_MESSAGE_FETCH_LIMIT),
        });
        // Fetch device list, pending messages, and local inbox contents in parallel.
        // Note: if any leg throws (e.g. store I/O failure from listInboxItems), the
        // entire Promise.all rejects and syncSecurePushInbox fails. Callers should
        // handle this — in the Raycast extension, inbox.tsx catches and falls back
        // to cached items.
        const [devices, response, localItems] = await Promise.all([
          fetchSecureDevicesWithCache(),
          apiBaseUrlFor(session)
            ? fetchWithTimeout(`${apiBaseUrlFor(session)}/v1/pending-messages?limit=${PENDING_MESSAGE_FETCH_LIMIT}`, {
                headers: apiHeaders(session.accessToken),
              })
            : fetchWithTimeout(
                `${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/pending_messages?${params.toString()}`,
                {
                  headers: restHeaders(session.accessToken),
                },
              ),
          options.store.listInboxItems(),
        ]);
        if (!response.ok) throw new Error(await parseErrorBody(response));
        const body = await response.json();
        const rows = apiBaseUrlFor(session)
          ? (body as { messages: PendingMessageRow[] }).messages
          : (body as PendingMessageRow[]);
        return processPendingMessageRows(rows, state, session, devices, localItems, generation);
      },
      async () => [],
    );
  }

  async function decryptPendingMessageRow(row: PendingMessageRow): Promise<SecurePushInboxItem | null> {
    const state = await bootstrapDevice();
    if (!state) return null;
    if (!UUID_REGEX.test(row.id) || !UUID_REGEX.test(row.sender_device_id)) return null;
    if (row.target_device_id !== state.id) return null;
    if (row.channel !== "push") return null;
    if (!isSupportedPayloadSchemaVersion(row.payload_schema_version)) {
      console.warn(
        `[SecureMessaging] decryptPendingMessageRow: unsupported payload schema version ${row.payload_schema_version} for message ${row.id}`,
      );
      return null;
    }
    const existing = await options.store.readInboxItem(row.id);
    if (existing) return existing;
    const devices = await fetchSecureDevicesWithCache();
    let deviceMap = new Map(devices.map((device) => [device.id, device]));
    let sender = deviceMap.get(row.sender_device_id);
    if (!sender?.public_key) {
      // Sender not found — may have registered within the cache TTL window.
      // Retry once with a fresh fetch before giving up.
      invalidateDeviceCache();
      const fresh = await fetchSecureDevicesWithCache();
      deviceMap = new Map(fresh.map((device) => [device.id, device]));
      sender = deviceMap.get(row.sender_device_id);
      if (!sender?.public_key) return null;
    }
    const payload = decryptPayloadFromSender<SecurePushPayload>(row.encrypted_payload, state, sender.public_key);
    if (!payload) return null;
    const item = toSecureInboxItem({
      id: row.id,
      channel: "push",
      content: payload.content,
      title: payload.title,
      sourceDevice: sender.display_name ?? sender.device_name,
      senderDeviceId: row.sender_device_id,
      targetDeviceId: row.target_device_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      direction: "incoming",
    });
    await options.store.upsertInboxItem(item);
    return item;
  }

  async function deactivateDevice(sessionOverride?: AuthSession | null): Promise<void> {
    const session = sessionOverride ?? (await options.sessionProvider.getSession());
    if (!session) return;
    const state = await options.store.readMetaValue<SecureDeviceState>(SECURE_DEVICE_META_KEY);
    if (!state || !isUuid(state.id)) return;
    const response = await fetchWithTimeout(
      apiBaseUrlFor(session)
        ? `${apiBaseUrlFor(session)}/v1/devices/${state.id}/deactivate`
        : `${options.supabaseUrl.replace(/\/+$/, "")}/rest/v1/devices?id=eq.${state.id}`,
      {
        method: apiBaseUrlFor(session) ? "POST" : "PATCH",
        headers: apiBaseUrlFor(session)
          ? apiHeaders(session.accessToken)
          : {
              ...restHeaders(session.accessToken),
              Prefer: "return=minimal",
            },
        body: apiBaseUrlFor(session) ? undefined : JSON.stringify({ is_active: false }),
      },
    );
    if (!response.ok) {
      console.warn("[SecurePush] deactivate_device_failed", response.status);
    }
    await response.text().catch(() => {});
  }

  async function clearUserData(clearOptions: { deactivateSession?: AuthSession | null } = {}): Promise<void> {
    localDataGeneration = Math.max(localDataGeneration, await readPersistedLocalDataGeneration()) + 1;
    await options.store.writeMetaValue(LOCAL_DATA_GENERATION_META_KEY, localDataGeneration);
    // Best-effort deactivation — don't block clearing local data if it fails.
    await deactivateDevice(clearOptions.deactivateSession).catch(() => {});
    // Null the in-flight device-state promise and device cache so that any
    // bootstrap call that starts after this point reads a fresh state from
    // the (now-empty) store rather than reusing a stale in-memory result.
    secureDeviceStatePromise = null;
    invalidateDeviceCache();
    await Promise.all([
      options.store.clearMetaStore(),
      options.store.clearInboxStore(),
      options.store.clearBlobStore(),
    ]);
    // Some store implementations clear all metadata; rewrite the persisted epoch
    // after teardown so other Raycast processes can still detect the sign-out.
    await options.store.writeMetaValue(LOCAL_DATA_GENERATION_META_KEY, localDataGeneration);
  }

  return {
    bootstrapDevice,
    readSecureDeviceId,
    fetchSecureDevices,
    fetchChannelDefinition,
    listSecurePushItems,
    deleteSecurePushItem,
    clearSecurePushItems,
    getStoredBlob,
    sendSecurePushItem,
    sendSecurePushFile,
    syncSecurePushInbox,
    ingestEncryptedPendingMessages,
    decryptPendingMessageRow,
    clearUserData,
  };
}
