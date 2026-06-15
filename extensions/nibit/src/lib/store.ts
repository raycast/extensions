import { LocalStorage, environment } from "@raycast/api";
import type { SecureInboxStore, SecurePushInboxItem } from "./secure";
import { promises as fs } from "fs";
import path from "path";

const META_PREFIX = "meta:";
const INBOX_PREFIX = "inbox:";
const BLOB_PREFIX = "blob:";
const LOCAL_DATA_GENERATION_STORAGE_KEY = `${META_PREFIX}local-data-generation`;

type RaycastBlobValue = {
  path: string;
  mimeType: string;
  expiresAt?: string | null;
};

function sanitizeFileName(fileName: string | undefined, fallbackKey: string): string {
  const trimmed = fileName?.trim();
  if (!trimmed) return `${fallbackKey}.bin`;
  const safe = trimmed.replace(/[^A-Za-z0-9._ -]/g, "_").trim();
  if (!safe) return `${fallbackKey}.bin`;
  const suffix = fallbackKey.slice(0, 8).replace(/[^A-Za-z0-9._-]/g, "_");
  const ext = path.extname(safe);
  const maxBaseLength = Math.max(1, 200 - suffix.length - (ext ? ext.length : 0) - 1);
  const base = (ext ? safe.slice(0, -ext.length) : safe).slice(0, maxBaseLength);
  return `${base}-${suffix}${ext}`;
}

function blobDirectoryPath(): string {
  return path.join(environment.supportPath, "secure-push-files");
}

async function ensureBlobDirectory(): Promise<string> {
  const dir = blobDirectoryPath();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function listKeys(prefix: string): Promise<string[]> {
  const all = await LocalStorage.allItems();
  return Object.keys(all).filter((key) => key.startsWith(prefix));
}

function parseStoredJson<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function removeBlobFile(blob: RaycastBlobValue | null) {
  if (!blob?.path) return;
  const root = path.resolve(blobDirectoryPath());
  const target = path.resolve(blob.path);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  await fs.rm(target, { force: true });
}

function isExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const time = Date.parse(expiresAt);
  return Number.isFinite(time) && time <= now;
}

async function pruneExpiredLocalData(): Promise<void> {
  const now = Date.now();
  const all = await LocalStorage.allItems();
  const removals: Promise<void>[] = [];

  for (const [key, raw] of Object.entries(all)) {
    if (key.startsWith(INBOX_PREFIX) && typeof raw === "string") {
      try {
        const item = JSON.parse(raw) as SecurePushInboxItem;
        if (isExpired(item.expires_at, now)) {
          const id = key.slice(INBOX_PREFIX.length);
          removals.push(LocalStorage.removeItem(key));
          removals.push(raycastSecureStore.deleteBlobValue(id));
        }
      } catch {
        // Leave malformed values for explicit clear/sign-out; listInboxItems filters them out.
      }
    }

    if (key.startsWith(BLOB_PREFIX) && typeof raw === "string") {
      try {
        const blob = JSON.parse(raw) as RaycastBlobValue;
        if (isExpired(blob.expiresAt, now)) {
          removals.push(removeBlobFile(blob));
          removals.push(LocalStorage.removeItem(key));
        }
      } catch {
        // Leave malformed values for explicit clear/sign-out.
      }
    }
  }

  await Promise.all(removals);
}

export const raycastSecureStore: SecureInboxStore<RaycastBlobValue> = {
  async readMetaValue<T>(key: string): Promise<T | null> {
    return parseStoredJson<T>(await LocalStorage.getItem<string>(`${META_PREFIX}${key}`));
  },
  async writeMetaValue<T>(key: string, value: T): Promise<void> {
    await LocalStorage.setItem(`${META_PREFIX}${key}`, JSON.stringify(value));
  },
  async upsertInboxItem(value: SecurePushInboxItem): Promise<void> {
    await LocalStorage.setItem(`${INBOX_PREFIX}${value.id}`, JSON.stringify(value));
  },
  async readInboxItem(id: string): Promise<SecurePushInboxItem | null> {
    return parseStoredJson<SecurePushInboxItem>(await LocalStorage.getItem<string>(`${INBOX_PREFIX}${id}`));
  },
  async deleteInboxItem(id: string): Promise<void> {
    await LocalStorage.removeItem(`${INBOX_PREFIX}${id}`);
  },
  async clearMetaStore(): Promise<void> {
    // Note: oauth.ts stores the auth-refresh lock under "meta:auth-refresh-lock",
    // which shares this prefix and will be deleted here. That is intentional —
    // this should only be called at sign-out, at which point no concurrent
    // token refresh should be in flight.
    const keys = (await listKeys(META_PREFIX)).filter((key) => key !== LOCAL_DATA_GENERATION_STORAGE_KEY);
    await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
  },
  async clearInboxStore(): Promise<void> {
    const keys = await listKeys(INBOX_PREFIX);
    await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
  },
  async listInboxItems(): Promise<SecurePushInboxItem[]> {
    await pruneExpiredLocalData();
    const all = await LocalStorage.allItems();
    const items = Object.entries(all)
      .filter(([key]) => key.startsWith(INBOX_PREFIX))
      .map(([, raw]) => parseStoredJson<SecurePushInboxItem>(raw));
    return items
      .filter((item): item is SecurePushInboxItem => item !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async writeBlobValue(
    key: string,
    bytes: Uint8Array,
    mimeType: string,
    fileName?: string,
    expiresAt?: string | null,
  ): Promise<void> {
    const dir = await ensureBlobDirectory();
    const filePath = path.join(dir, sanitizeFileName(fileName, key));
    await fs.writeFile(filePath, bytes);
    try {
      await LocalStorage.setItem(`${BLOB_PREFIX}${key}`, JSON.stringify({ path: filePath, mimeType, expiresAt }));
    } catch (error) {
      await removeBlobFile({ path: filePath, mimeType, expiresAt });
      throw error;
    }
  },
  async readBlobValue(key: string): Promise<RaycastBlobValue | null> {
    const blob = parseStoredJson<RaycastBlobValue>(await LocalStorage.getItem<string>(`${BLOB_PREFIX}${key}`));
    if (isExpired(blob?.expiresAt)) {
      await raycastSecureStore.deleteBlobValue(key);
      return null;
    }
    return blob;
  },
  async deleteBlobValue(key: string): Promise<void> {
    await removeBlobFile(parseStoredJson<RaycastBlobValue>(await LocalStorage.getItem<string>(`${BLOB_PREFIX}${key}`)));
    await LocalStorage.removeItem(`${BLOB_PREFIX}${key}`);
  },
  async clearBlobStore(): Promise<void> {
    const keys = await listKeys(BLOB_PREFIX);
    await Promise.all(
      keys.map(async (key) => {
        await removeBlobFile(parseStoredJson<RaycastBlobValue>(await LocalStorage.getItem<string>(key)));
        await LocalStorage.removeItem(key);
      }),
    );
  },
};
