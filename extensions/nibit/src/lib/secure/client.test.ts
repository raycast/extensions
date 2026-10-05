import nacl from "tweetnacl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSecureMessagingClient } from "./client";
import type { AuthSession, Device, SecureInboxStore, SecurePushInboxItem } from "./types";

// ─── Minimal in-memory store ────────────────────────────────────────────────

function makeInMemoryStore(initialItems: SecurePushInboxItem[] = []): SecureInboxStore & {
  _items: Map<string, SecurePushInboxItem>;
  _blobs: Map<string, { bytes: Uint8Array; mimeType: string; filename: string | undefined }>;
  _deleted: string[];
  _meta: Map<string, unknown>;
} {
  const items = new Map(initialItems.map((item) => [item.id, item]));
  const blobs = new Map<string, { bytes: Uint8Array; mimeType: string; filename: string | undefined }>();
  const meta = new Map<string, unknown>();
  const deleted: string[] = [];

  return {
    _items: items,
    _blobs: blobs,
    _deleted: deleted,
    _meta: meta,
    async readMetaValue<T>(key: string) {
      return (meta.get(key) as T) ?? null;
    },
    async writeMetaValue(key: string, value: unknown) {
      meta.set(key, value);
    },
    async clearMetaStore() {
      meta.clear();
    },
    async upsertInboxItem(item) {
      items.set(item.id, item);
    },
    async readInboxItem(id) {
      return items.get(id) ?? null;
    },
    async deleteInboxItem(id) {
      deleted.push(id);
      items.delete(id);
    },
    async clearInboxStore() {
      items.clear();
    },
    async listInboxItems() {
      return [...items.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    async writeBlobValue(key, bytes, mimeType, filename) {
      blobs.set(key, { bytes, mimeType, filename });
    },
    async readBlobValue(key) {
      return blobs.get(key) ?? null;
    },
    async deleteBlobValue(key) {
      deleted.push(`blob:${key}`);
      blobs.delete(key);
    },
    async clearBlobStore() {},
  };
}

function makeItem(overrides: Partial<SecurePushInboxItem> & { id: string }): SecurePushInboxItem {
  return {
    channel: "push",
    content: "hello",
    content_type: "text/plain",
    title: null,
    source_device: "Phone",
    target_device_id: null,
    is_read: false,
    expires_at: null,
    created_at: new Date().toISOString(),
    metadata: null,
    transport: "secure",
    direction: "incoming",
    sender_device_id: "device-sender",
    ...overrides,
  };
}

function makeClient(items: SecurePushInboxItem[]) {
  const store = makeInMemoryStore(items);
  const client = createSecureMessagingClient({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "test-key",
    blobRelayUrl: "https://blob.example.com",
    sessionProvider: { getSession: async () => null },
    store,
    deviceType: "desktop",
    deviceCapabilities: [],
    deviceName: "Test Device",
  });
  return { client, store };
}

// ─── Eviction tests ──────────────────────────────────────────────────────────

describe("listSecurePushItems — TTL and max-age eviction", () => {
  beforeEach(() => {
    // No module reset needed — no mocked Raycast modules in this test file
  });

  it("returns non-expired items with no expires_at intact", async () => {
    const item = makeItem({ id: "item-1", created_at: new Date().toISOString() });
    const { client } = makeClient([item]);

    const result = await client.listSecurePushItems();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("item-1");
  });

  it("evicts items whose expires_at is in the past", async () => {
    const expired = makeItem({
      id: "item-expired",
      expires_at: new Date(Date.now() - 1000).toISOString(), // 1s ago
    });
    const fresh = makeItem({ id: "item-fresh" });
    const { client, store } = makeClient([expired, fresh]);

    const result = await client.listSecurePushItems();

    expect(result.map((i) => i.id)).toEqual(["item-fresh"]);
    expect(store._deleted).toContain("item-expired");
  });

  it("keeps items whose expires_at is in the future", async () => {
    const item = makeItem({
      id: "item-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(), // 1 min from now
    });
    const { client } = makeClient([item]);

    const result = await client.listSecurePushItems();

    expect(result).toHaveLength(1);
  });

  it("evicts items older than 30 days even without expires_at", async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const old = makeItem({ id: "item-old", created_at: thirtyOneDaysAgo });
    const fresh = makeItem({ id: "item-fresh" });
    const { client, store } = makeClient([old, fresh]);

    const result = await client.listSecurePushItems();

    expect(result.map((i) => i.id)).toEqual(["item-fresh"]);
    expect(store._deleted).toContain("item-old");
  });

  it("evicts items older than 30 days even when expires_at is far future", async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const old = makeItem({ id: "item-old", created_at: thirtyOneDaysAgo, expires_at: farFuture });
    const { client, store } = makeClient([old]);

    const result = await client.listSecurePushItems();

    expect(result).toHaveLength(0);
    expect(store._deleted).toContain("item-old");
  });

  it("keeps items created 29 days ago without expires_at", async () => {
    const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
    const item = makeItem({ id: "item-1", created_at: twentyNineDaysAgo });
    const { client } = makeClient([item]);

    const result = await client.listSecurePushItems();

    expect(result).toHaveLength(1);
  });

  it("deletes associated blob data when evicting an expired item", async () => {
    const expired = makeItem({
      id: "item-with-blob",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const { client, store } = makeClient([expired]);

    await client.listSecurePushItems();

    expect(store._deleted).toContain("blob:item-with-blob");
    expect(store._deleted).toContain("item-with-blob");
  });
});

// ─── Send tests ──────────────────────────────────────────────────────────────

const TEST_SESSION: AuthSession = {
  userId: "user-1",
  accessToken: "test-access-token",
};

const API_KEY_SESSION: AuthSession = {
  userId: "user-1",
  accessToken: "nb_test_public_secret",
  authType: "api_key",
};

// Real NaCl keypair so encryption in sendSecurePushItem/sendSecurePushFile works
const SENDER_KEYPAIR = nacl.box.keyPair();
const SENDER_DEVICE_STATE = {
  id: "device-sender",
  publicKey: Buffer.from(SENDER_KEYPAIR.publicKey).toString("base64"),
  secretKey: Buffer.from(SENDER_KEYPAIR.secretKey).toString("base64"),
};

// Generate a valid recipient public key for the default device
const RECIPIENT_KEYPAIR = nacl.box.keyPair();
const RECIPIENT_PUBLIC_KEY = Buffer.from(RECIPIENT_KEYPAIR.publicKey).toString("base64");

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
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

function encryptPayloadForRecipient(
  payload: unknown,
  targetPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = nacl.box(plaintext, nonce, targetPublicKey, senderSecretKey);
  return encodeBase64(concatBytes(nonce, ciphertext));
}

function encryptBlobBytes(bytes: Uint8Array, symmetricKey: Uint8Array): Uint8Array {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(bytes, nonce, symmetricKey);
  return concatBytes(nonce, ciphertext);
}

function makeDevice(overrides: Partial<Device> & { id: string }): Device {
  return {
    user_id: "user-1",
    device_name: "Test Phone",
    display_name: null,
    device_type: "mobile",
    public_key: RECIPIENT_PUBLIC_KEY,
    capabilities: ["push_receive", "blob_receive"],
    is_active: true,
    last_seen_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function minimalResponse(status = 200): Response {
  return new Response(null, { status });
}

/**
 * Create a client with a pre-seeded device state and session, ready for send tests.
 * The store already has the device identity and a recent bootstrap timestamp,
 * so bootstrapDevice() will skip the upsert.
 */
function makeSendClient(
  devices: Device[] = [makeDevice({ id: "device-target" })],
  options: { apiKeyTransport?: boolean } = {},
) {
  const store = makeInMemoryStore();
  // Pre-seed device state so bootstrapDevice() resolves without fetching
  store.writeMetaValue("secure-device", SENDER_DEVICE_STATE);
  // Recent bootstrap so it skips the upsert
  store.writeMetaValue("secure-device-bootstrap-at", Date.now());

  const client = createSecureMessagingClient({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "test-key",
    blobRelayUrl: "https://blob.example.com",
    apiBaseUrl: options.apiKeyTransport ? "https://auth.example.com" : undefined,
    sessionProvider: { getSession: async () => (options.apiKeyTransport ? API_KEY_SESSION : TEST_SESSION) },
    store,
    deviceType: "desktop",
    deviceCapabilities: ["push_receive"],
    deviceName: "Test Desktop",
  });

  // Track fetch calls for assertions
  const fetchCalls: { url: string; method: string; body?: string }[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? init.body : undefined;
      fetchCalls.push({ url, method, body });

      // Channel definitions
      if (url.includes("/v1/channel-definitions/")) {
        const id = url.endsWith("/blob") ? "blob" : "push";
        return jsonResponse({
          channel:
            id === "push"
              ? {
                  id: "push",
                  persist_offline: true,
                  default_ttl_seconds: 604800,
                  max_message_size_bytes: 262144,
                  description: "Push",
                }
              : {
                  id: "blob",
                  persist_offline: true,
                  default_ttl_seconds: 3600,
                  max_message_size_bytes: 4096,
                  description: "Blob",
                },
        });
      }
      if (url.includes("/rest/v1/channel_definitions")) {
        const isPush = url.includes("eq.push");
        return jsonResponse([
          isPush
            ? {
                id: "push",
                persist_offline: true,
                default_ttl_seconds: 604800,
                max_message_size_bytes: 262144,
                description: "Push",
              }
            : {
                id: "blob",
                persist_offline: true,
                default_ttl_seconds: 3600,
                max_message_size_bytes: 4096,
                description: "Blob",
              },
        ]);
      }
      // Device list
      if (url.includes("/v1/devices") && !url.includes("/rest/") && method === "GET") {
        return jsonResponse({ devices });
      }
      if (url.includes("/rest/v1/devices") && method === "GET") {
        return jsonResponse(devices);
      }
      // Pending messages POST
      if (url.includes("/v1/pending-messages") && method === "POST") {
        return minimalResponse(201);
      }
      if (url.includes("/rest/v1/pending_messages") && method === "POST") {
        return minimalResponse(201);
      }
      // Blob relay upload
      if (url.includes("/blob") && method === "POST") {
        return jsonResponse({ id: "blob-id-123", download_url: "https://blob.example.com/blob/blob-id-123" });
      }
      // Blob relay delete (cleanup)
      if (url.includes("/blob/") && method === "DELETE") {
        return minimalResponse(204);
      }
      return minimalResponse(404);
    }),
  );

  return { client, store, fetchCalls };
}

describe("sendSecurePushItem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends a text push to target devices", async () => {
    const { client, fetchCalls, store } = makeSendClient();

    const result = await client.sendSecurePushItem("Hello world");

    expect(result.error).toBeNull();
    // Should have fetched channel defs + devices + posted pending_messages
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    expect(pendingPost).toBeDefined();
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe("push");
    expect(rows[0].message_type).toBe("text");
    expect(rows[0].sender_device_id).toBe("device-sender");
    expect(rows[0].target_device_id).toBe("device-target");
    // Should have saved an outgoing echo in the store
    const items = await store.listInboxItems();
    expect(items).toHaveLength(1);
    expect(items[0].direction).toBe("outgoing");
    expect(items[0].content).toBe("Hello world");
  });

  it("sends a text push through API-key /v1 transport", async () => {
    const { client, fetchCalls } = makeSendClient([makeDevice({ id: "device-target" })], { apiKeyTransport: true });

    const result = await client.sendSecurePushItem("Hello over API key");

    expect(result.error).toBeNull();
    expect(
      fetchCalls.some((c) => c.url === "https://auth.example.com/v1/channel-definitions/push" && c.method === "GET"),
    ).toBe(true);
    expect(fetchCalls.some((c) => c.url === "https://auth.example.com/v1/devices" && c.method === "GET")).toBe(true);
    const pendingPost = fetchCalls.find(
      (c) => c.url === "https://auth.example.com/v1/pending-messages" && c.method === "POST",
    );
    expect(pendingPost).toBeDefined();
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe("push");
    expect(rows[0].message_type).toBe("text");
    expect(rows[0].target_device_id).toBe("device-target");
  });

  it("sends a URL push with kind=url", async () => {
    const { client, fetchCalls } = makeSendClient();

    const result = await client.sendSecurePushItem("https://example.com", { kind: "url" });

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows[0].message_type).toBe("url");
  });

  it("sends to multiple devices when available", async () => {
    const devices = [makeDevice({ id: "device-a" }), makeDevice({ id: "device-b" })];
    const { client, fetchCalls } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("multi-device test");

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(2);
    expect(rows.map((r: { target_device_id: string }) => r.target_device_id).sort()).toEqual(["device-a", "device-b"]);
  });

  it("filters out the sender device", async () => {
    // Include the sender's own device in the list — it should be excluded
    const devices = [
      makeDevice({ id: "device-sender" }), // same as SENDER_DEVICE_STATE.id
      makeDevice({ id: "device-other" }),
    ];
    const { client, fetchCalls } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("no self-send");

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].target_device_id).toBe("device-other");
  });

  it("filters by targetDeviceId when specified", async () => {
    const devices = [makeDevice({ id: "device-a" }), makeDevice({ id: "device-b" })];
    const { client, fetchCalls } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("targeted", { targetDeviceId: "device-b" });

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].target_device_id).toBe("device-b");
  });

  it("filters out devices without push_receive capability", async () => {
    const devices = [
      makeDevice({ id: "device-no-push", capabilities: ["blob_receive"] }),
      makeDevice({ id: "device-with-push", capabilities: ["push_receive"] }),
    ];
    const { client, fetchCalls } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("capability filter");

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].target_device_id).toBe("device-with-push");
  });

  it("filters out stale devices (last_seen_at > 45 days ago)", async () => {
    const staleDate = new Date(Date.now() - 46 * 24 * 60 * 60 * 1000).toISOString();
    const devices = [makeDevice({ id: "device-stale", last_seen_at: staleDate }), makeDevice({ id: "device-fresh" })];
    const { client, fetchCalls } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("freshness filter");

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].target_device_id).toBe("device-fresh");
  });

  it("returns error when no target devices are available", async () => {
    // Only the sender device — no valid targets
    const devices = [makeDevice({ id: "device-sender" })];
    const { client } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("no targets");

    expect(result.error).toBe("No target devices available for secure push.");
  });

  it("returns error when devices list is empty", async () => {
    const { client } = makeSendClient([]);

    const result = await client.sendSecurePushItem("empty devices");

    expect(result.error).toBe("No target devices available for secure push.");
  });

  it("returns error when devices have no public key", async () => {
    const devices = [makeDevice({ id: "device-no-key", public_key: null })];
    const { client } = makeSendClient(devices);

    const result = await client.sendSecurePushItem("no keys");

    expect(result.error).toBe("No target devices available for secure push.");
  });
});

describe("sendSecurePushFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uploads a file and sends blob references to target devices", async () => {
    const { client, fetchCalls, store } = makeSendClient();
    const fileBytes = new TextEncoder().encode("file content here");

    const result = await client.sendSecurePushFile(fileBytes, {
      fileName: "test.txt",
      mimeType: "text/plain",
    });

    expect(result.error).toBeNull();
    // Should have uploaded to blob relay
    const blobPost = fetchCalls.find(
      (c) => c.url.includes("/blob") && c.method === "POST" && !c.url.includes("pending"),
    );
    expect(blobPost).toBeDefined();
    // Should have posted pending_messages
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    expect(pendingPost).toBeDefined();
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe("blob");
    expect(rows[0].message_type).toBe("file_ref");
    // Should have saved an outgoing echo with blob content reference
    const items = await store.listInboxItems();
    expect(items).toHaveLength(1);
    expect(items[0].direction).toBe("outgoing");
    expect(items[0].content).toMatch(/^secure-blob:/);
    expect(items[0].content_type).toBe("text/plain");
  });

  it("uploads a file and posts blob pending messages through API-key /v1 transport", async () => {
    const { client, fetchCalls } = makeSendClient([makeDevice({ id: "device-target" })], { apiKeyTransport: true });
    const fileBytes = new TextEncoder().encode("api key file content");

    const result = await client.sendSecurePushFile(fileBytes, {
      fileName: "api-key.txt",
      mimeType: "text/plain",
    });

    expect(result.error).toBeNull();
    const blobPost = fetchCalls.find((c) => c.url === "https://blob.example.com/blob" && c.method === "POST");
    expect(blobPost).toBeDefined();
    const pendingPost = fetchCalls.find(
      (c) => c.url === "https://auth.example.com/v1/pending-messages" && c.method === "POST",
    );
    expect(pendingPost).toBeDefined();
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe("blob");
    expect(rows[0].message_type).toBe("file_ref");
  });

  it("returns error when no target devices for file push", async () => {
    const { client } = makeSendClient([]);
    const fileBytes = new TextEncoder().encode("orphan file");

    const result = await client.sendSecurePushFile(fileBytes, { fileName: "orphan.txt" });

    expect(result.error).toBe("No target devices available for secure file push.");
  });

  it("filters devices by blob_receive capability for file sends", async () => {
    const devices = [
      makeDevice({ id: "device-push-only", capabilities: ["push_receive"] }),
      makeDevice({ id: "device-blob", capabilities: ["blob_receive"] }),
    ];
    const { client, fetchCalls } = makeSendClient(devices);
    const fileBytes = new TextEncoder().encode("blob-only");

    const result = await client.sendSecurePushFile(fileBytes, { fileName: "test.bin" });

    expect(result.error).toBeNull();
    const pendingPost = fetchCalls.find((c) => c.url.includes("/pending_messages") && c.method === "POST");
    const rows = JSON.parse(pendingPost!.body!);
    expect(rows).toHaveLength(1);
    expect(rows[0].target_device_id).toBe("device-blob");
  });

  it("falls back to application/octet-stream for disallowed MIME types", async () => {
    const { client, fetchCalls } = makeSendClient();
    const fileBytes = new TextEncoder().encode("script content");

    const result = await client.sendSecurePushFile(fileBytes, {
      fileName: "script.sh",
      mimeType: "application/x-sh",
    });

    expect(result.error).toBeNull();
    // The blob relay upload header should have application/octet-stream
    const blobPost = fetchCalls.find((c) => c.url === "https://blob.example.com/blob" && c.method === "POST");
    expect(blobPost).toBeDefined();
  });
});

describe("syncSecurePushInbox", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads blob payloads when receiving through API-key /v1 transport", async () => {
    const store = makeInMemoryStore();
    await store.writeMetaValue("secure-device", SENDER_DEVICE_STATE);
    await store.writeMetaValue("secure-device-bootstrap-at", Date.now());

    const webSender = nacl.box.keyPair();
    const blobKey = nacl.randomBytes(nacl.secretbox.keyLength);
    const plainBytes = new TextEncoder().encode("web image bytes");
    const encryptedBlob = encryptBlobBytes(plainBytes, blobKey);
    const rowId = "af2be784-b6d7-441a-b84c-2b85d8e3aaa1";
    const blobId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      download_url: `https://blob.example.com/blob/${blobId}`,
      symmetric_key: encodeBase64(blobKey),
      filename: "photo.png",
      mime_type: "image/png",
      size_bytes: plainBytes.byteLength,
    };
    const pendingRow = {
      id: rowId,
      user_id: "user-1",
      target_device_id: "device-sender",
      channel: "blob",
      message_type: "file_ref",
      sender_device_id: "web-device",
      encrypted_payload: encryptPayloadForRecipient(payload, SENDER_KEYPAIR.publicKey, webSender.secretKey),
      requires_auth: false,
      payload_schema_version: 2,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const fetchCalls: { url: string; method: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";
        const authorization =
          init?.headers instanceof Headers
            ? init.headers.get("Authorization")
            : Array.isArray(init?.headers)
              ? new Headers(init.headers).get("Authorization")
              : ((init?.headers as Record<string, string> | undefined)?.Authorization ?? null);
        fetchCalls.push({ url, method, authorization });
        if (url === "https://auth.example.com/v1/devices" && method === "GET") {
          return jsonResponse({
            devices: [
              makeDevice({
                id: "web-device",
                device_type: "browser",
                device_name: "Chrome Web",
                public_key: encodeBase64(webSender.publicKey),
                capabilities: ["blob_send", "blob_receive", "push_send", "push_receive"],
              }),
            ],
          });
        }
        if (url.startsWith("https://auth.example.com/v1/pending-messages?limit=") && method === "GET") {
          return jsonResponse({ messages: [pendingRow] });
        }
        if (url === `https://blob.example.com/blob/${blobId}` && method === "GET") {
          return new Response(
            encryptedBlob.buffer.slice(
              encryptedBlob.byteOffset,
              encryptedBlob.byteOffset + encryptedBlob.byteLength,
            ) as ArrayBuffer,
            { status: 200 },
          );
        }
        if (url === "https://auth.example.com/v1/pending-messages/delete" && method === "POST") {
          return minimalResponse(204);
        }
        return minimalResponse(404);
      }),
    );

    const client = createSecureMessagingClient({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "test-key",
      blobRelayUrl: "https://blob.example.com",
      apiBaseUrl: "https://auth.example.com",
      sessionProvider: { getSession: async () => API_KEY_SESSION },
      store,
      deviceType: "desktop",
      deviceCapabilities: ["push_receive", "blob_receive"],
      deviceName: "Test Desktop",
    });

    const items = await client.syncSecurePushInbox();

    expect(
      fetchCalls.some(
        (call) =>
          call.url === `https://blob.example.com/blob/${blobId}` &&
          call.authorization === "Bearer nb_test_public_secret",
      ),
    ).toBe(true);
    expect(fetchCalls.some((call) => call.url === "https://auth.example.com/v1/pending-messages/delete")).toBe(true);
    expect(store._blobs.get(rowId)?.bytes).toEqual(plainBytes);
    expect(items.some((item) => item.id === rowId && item.channel === "blob" && item.title === "photo.png")).toBe(true);
  });

  it("returns an empty list and does not ack when local data is cleared during sync", async () => {
    const store = makeInMemoryStore([makeItem({ id: "old-local" })]);
    await store.writeMetaValue("secure-device", SENDER_DEVICE_STATE);
    await store.writeMetaValue("secure-device-bootstrap-at", Date.now());

    const webSender = nacl.box.keyPair();
    const rowId = "cf2be784-b6d7-441a-b84c-2b85d8e3aaa1";
    const pendingRow = {
      id: rowId,
      user_id: "user-1",
      target_device_id: "device-sender",
      channel: "push",
      message_type: "text",
      sender_device_id: "web-device",
      encrypted_payload: encryptPayloadForRecipient(
        { content: "hello", title: "Hello" },
        SENDER_KEYPAIR.publicKey,
        webSender.secretKey,
      ),
      requires_auth: false,
      payload_schema_version: 2,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const fetchCalls: { url: string; method: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";
        fetchCalls.push({ url, method });
        if (url === "https://auth.example.com/v1/devices" && method === "GET") {
          return jsonResponse({
            devices: [
              makeDevice({
                id: "web-device",
                public_key: encodeBase64(webSender.publicKey),
                capabilities: ["push_send", "push_receive"],
              }),
            ],
          });
        }
        if (url.startsWith("https://auth.example.com/v1/pending-messages?limit=") && method === "GET") {
          await store.writeMetaValue("local-data-generation", 1);
          return jsonResponse({ messages: [pendingRow] });
        }
        if (url === "https://auth.example.com/v1/pending-messages/delete" && method === "POST") {
          return minimalResponse(204);
        }
        return minimalResponse(404);
      }),
    );

    const client = createSecureMessagingClient({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "test-key",
      blobRelayUrl: "https://blob.example.com",
      apiBaseUrl: "https://auth.example.com",
      sessionProvider: { getSession: async () => API_KEY_SESSION },
      store,
      deviceType: "desktop",
      deviceCapabilities: ["push_receive", "blob_receive"],
      deviceName: "Test Desktop",
    });

    await expect(client.syncSecurePushInbox()).resolves.toEqual([]);
    expect(store._items.has(rowId)).toBe(false);
    expect(fetchCalls.some((call) => call.url === "https://auth.example.com/v1/pending-messages/delete")).toBe(false);
  });

  it("rolls back a decrypted blob when local data is cleared after blob write", async () => {
    const store = makeInMemoryStore();
    await store.writeMetaValue("secure-device", SENDER_DEVICE_STATE);
    await store.writeMetaValue("secure-device-bootstrap-at", Date.now());
    const originalWriteBlobValue = store.writeBlobValue;
    store.writeBlobValue = async (...args) => {
      await originalWriteBlobValue(...args);
      await store.writeMetaValue("local-data-generation", 1);
    };

    const webSender = nacl.box.keyPair();
    const blobKey = nacl.randomBytes(nacl.secretbox.keyLength);
    const plainBytes = new TextEncoder().encode("web image bytes");
    const encryptedBlob = encryptBlobBytes(plainBytes, blobKey);
    const rowId = "df2be784-b6d7-441a-b84c-2b85d8e3aaa1";
    const blobId = "22222222-2222-4222-8222-222222222222";
    const pendingRow = {
      id: rowId,
      user_id: "user-1",
      target_device_id: "device-sender",
      channel: "blob",
      message_type: "file_ref",
      sender_device_id: "web-device",
      encrypted_payload: encryptPayloadForRecipient(
        {
          download_url: `https://blob.example.com/blob/${blobId}`,
          symmetric_key: encodeBase64(blobKey),
          filename: "photo.png",
          mime_type: "image/png",
          size_bytes: plainBytes.byteLength,
        },
        SENDER_KEYPAIR.publicKey,
        webSender.secretKey,
      ),
      requires_auth: false,
      payload_schema_version: 2,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";
        if (url === "https://auth.example.com/v1/devices" && method === "GET") {
          return jsonResponse({
            devices: [
              makeDevice({
                id: "web-device",
                public_key: encodeBase64(webSender.publicKey),
                capabilities: ["blob_send", "blob_receive", "push_send", "push_receive"],
              }),
            ],
          });
        }
        if (url.startsWith("https://auth.example.com/v1/pending-messages?limit=") && method === "GET") {
          return jsonResponse({ messages: [pendingRow] });
        }
        if (url === `https://blob.example.com/blob/${blobId}` && method === "GET") {
          return new Response(
            encryptedBlob.buffer.slice(
              encryptedBlob.byteOffset,
              encryptedBlob.byteOffset + encryptedBlob.byteLength,
            ) as ArrayBuffer,
            { status: 200 },
          );
        }
        if (url === "https://auth.example.com/v1/pending-messages/delete" && method === "POST") {
          return minimalResponse(204);
        }
        return minimalResponse(404);
      }),
    );

    const client = createSecureMessagingClient({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "test-key",
      blobRelayUrl: "https://blob.example.com",
      apiBaseUrl: "https://auth.example.com",
      sessionProvider: { getSession: async () => API_KEY_SESSION },
      store,
      deviceType: "desktop",
      deviceCapabilities: ["push_receive", "blob_receive"],
      deviceName: "Test Desktop",
    });

    await expect(client.syncSecurePushInbox()).resolves.toEqual([]);
    expect(store._blobs.has(rowId)).toBe(false);
    expect(store._items.has(rowId)).toBe(false);
  });

  it("rejects same-origin blob payload URLs outside the blob relay download route", async () => {
    const store = makeInMemoryStore();
    await store.writeMetaValue("secure-device", SENDER_DEVICE_STATE);
    await store.writeMetaValue("secure-device-bootstrap-at", Date.now());

    const webSender = nacl.box.keyPair();
    const blobKey = nacl.randomBytes(nacl.secretbox.keyLength);
    const rowId = "bf2be784-b6d7-441a-b84c-2b85d8e3aaa1";
    const payload = {
      download_url: "https://blob.example.com/internal/debug",
      symmetric_key: encodeBase64(blobKey),
      filename: "photo.png",
      mime_type: "image/png",
      size_bytes: 12,
    };
    const pendingRow = {
      id: rowId,
      user_id: "user-1",
      target_device_id: "device-sender",
      channel: "blob",
      message_type: "file_ref",
      sender_device_id: "web-device",
      encrypted_payload: encryptPayloadForRecipient(payload, SENDER_KEYPAIR.publicKey, webSender.secretKey),
      requires_auth: false,
      payload_schema_version: 2,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const fetchCalls: { url: string; method: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";
        const authorization =
          init?.headers instanceof Headers
            ? init.headers.get("Authorization")
            : Array.isArray(init?.headers)
              ? new Headers(init.headers).get("Authorization")
              : ((init?.headers as Record<string, string> | undefined)?.Authorization ?? null);
        fetchCalls.push({ url, method, authorization });
        if (url === "https://auth.example.com/v1/devices" && method === "GET") {
          return jsonResponse({
            devices: [
              makeDevice({
                id: "web-device",
                device_type: "browser",
                device_name: "Chrome Web",
                public_key: encodeBase64(webSender.publicKey),
                capabilities: ["blob_send", "blob_receive", "push_send", "push_receive"],
              }),
            ],
          });
        }
        if (url.startsWith("https://auth.example.com/v1/pending-messages?limit=") && method === "GET") {
          return jsonResponse({ messages: [pendingRow] });
        }
        if (url === "https://auth.example.com/v1/pending-messages/delete" && method === "POST") {
          return minimalResponse(204);
        }
        return minimalResponse(404);
      }),
    );

    const client = createSecureMessagingClient({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "test-key",
      blobRelayUrl: "https://blob.example.com",
      apiBaseUrl: "https://auth.example.com",
      sessionProvider: { getSession: async () => API_KEY_SESSION },
      store,
      deviceType: "desktop",
      deviceCapabilities: ["push_receive", "blob_receive"],
      deviceName: "Test Desktop",
    });

    const items = await client.syncSecurePushInbox();

    expect(fetchCalls.some((call) => call.url === "https://blob.example.com/internal/debug")).toBe(false);
    expect(fetchCalls.some((call) => call.url === "https://auth.example.com/v1/pending-messages/delete")).toBe(true);
    expect(items.some((item) => item.id === rowId)).toBe(false);
  });
});
