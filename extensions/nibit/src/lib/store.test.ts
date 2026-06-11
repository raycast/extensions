import os from "os";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const localStorageState = new Map<string, string>();
const environment = {
  supportPath: path.join(os.tmpdir(), "nibit-raycast-store-tests"),
};

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    async getItem<T extends string>(key: string): Promise<T | undefined> {
      return localStorageState.get(key) as T | undefined;
    },
    async setItem(key: string, value: string): Promise<void> {
      localStorageState.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      localStorageState.delete(key);
    },
    async allItems(): Promise<Record<string, string>> {
      return Object.fromEntries(localStorageState.entries());
    },
  },
  environment,
}));

describe("raycastSecureStore", () => {
  beforeEach(async () => {
    localStorageState.clear();
    environment.supportPath = path.join(os.tmpdir(), `nibit-raycast-store-tests-${Date.now()}`);
    vi.resetModules();
  });

  it("round-trips inbox items through LocalStorage", async () => {
    const { raycastSecureStore } = await import("./store");
    const item = {
      id: "item-1",
      channel: "push",
      content: "hello",
      content_type: "text/plain",
      title: null,
      source_device: "Phone",
      target_device_id: null,
      is_read: false,
      expires_at: null,
      created_at: "2026-04-21T10:00:00.000Z",
      metadata: { transport: "secure", direction: "incoming", sender_device_id: "device-1" },
      transport: "secure" as const,
      direction: "incoming" as const,
      sender_device_id: "device-1",
    };

    await raycastSecureStore.upsertInboxItem(item);

    expect(await raycastSecureStore.readInboxItem(item.id)).toEqual(item);
    expect(await raycastSecureStore.listInboxItems()).toEqual([item]);
  });

  it("stores blob metadata and removes blob files during clear", async () => {
    const fs = await import("fs/promises");
    const { raycastSecureStore } = await import("./store");

    await raycastSecureStore.writeBlobValue("blob-1", new Uint8Array([1, 2, 3]), "image/png", "image.png");
    const stored = await raycastSecureStore.readBlobValue("blob-1");

    expect(stored?.mimeType).toBe("image/png");
    expect(stored?.path).toContain("secure-push-files");
    expect(await fs.readFile(stored!.path)).toEqual(Buffer.from([1, 2, 3]));

    await raycastSecureStore.clearBlobStore();

    await expect(fs.readFile(stored!.path)).rejects.toThrow();
    expect(await raycastSecureStore.readBlobValue("blob-1")).toBeNull();
  });

  it("clears malformed local cache entries without blocking sign-out cleanup", async () => {
    localStorageState.set("meta:local-data-generation", "not-json");
    localStorageState.set("inbox:bad", "not-json");
    localStorageState.set("blob:bad", "not-json");

    const { raycastSecureStore } = await import("./store");

    await expect(raycastSecureStore.readMetaValue("local-data-generation")).resolves.toBeNull();
    await expect(raycastSecureStore.readInboxItem("bad")).resolves.toBeNull();
    await expect(raycastSecureStore.readBlobValue("bad")).resolves.toBeNull();
    await expect(raycastSecureStore.listInboxItems()).resolves.toEqual([]);
    await expect(raycastSecureStore.clearBlobStore()).resolves.toBeUndefined();

    expect(localStorageState.has("blob:bad")).toBe(false);
  });

  it("does not delete blob paths outside the extension blob directory", async () => {
    const fs = await import("fs/promises");
    const { raycastSecureStore } = await import("./store");
    const outsidePath = path.join(environment.supportPath, "outside.txt");
    await fs.mkdir(environment.supportPath, { recursive: true });
    await fs.writeFile(outsidePath, "keep me");
    localStorageState.set("blob:evil", JSON.stringify({ path: outsidePath, mimeType: "text/plain" }));

    await raycastSecureStore.deleteBlobValue("evil");

    await expect(fs.readFile(outsidePath, "utf8")).resolves.toBe("keep me");
    expect(localStorageState.has("blob:evil")).toBe(false);
  });

  it("prunes expired inbox items and decrypted blob files using their TTL", async () => {
    const fs = await import("fs/promises");
    const { raycastSecureStore } = await import("./store");
    const expiredAt = new Date(Date.now() - 1000).toISOString();
    const item = {
      id: "blob-expired",
      channel: "blob",
      content: "secure-blob:blob-expired",
      content_type: "image/png",
      title: "Expired image",
      source_device: "Phone",
      target_device_id: null,
      is_read: false,
      expires_at: expiredAt,
      created_at: "2026-04-21T10:00:00.000Z",
      metadata: { transport: "secure", direction: "incoming", sender_device_id: "device-1" },
      transport: "secure" as const,
      direction: "incoming" as const,
      sender_device_id: "device-1",
    };

    await raycastSecureStore.upsertInboxItem(item);
    await raycastSecureStore.writeBlobValue(
      "blob-expired",
      new Uint8Array([1, 2, 3]),
      "image/png",
      "image.png",
      expiredAt,
    );
    const stored = await raycastSecureStore.readBlobValue("blob-expired");

    expect(stored).toBeNull();
    expect(await raycastSecureStore.listInboxItems()).toEqual([]);
    await expect(fs.readdir(path.join(environment.supportPath, "secure-push-files"))).resolves.toEqual([]);
  });
});
