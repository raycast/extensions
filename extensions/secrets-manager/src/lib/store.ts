import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { KeyStore } from "./keystore";
import { encrypt, decrypt, Encrypted } from "./crypto";
import { Store, Secret, TagInfo, emptyStore, normalizeStore } from "./types";

export type SecretInput = {
  name: string;
  value: string;
  folder: string[];
  tags: string[];
};

export class SecretsStore {
  constructor(
    private filePath: string,
    private keyStore: KeyStore,
    private afterSave?: (filePath: string) => Promise<void>,
  ) {}

  async load(): Promise<Store> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
      throw e;
    }
    const enc = JSON.parse(raw) as Encrypted;
    const key = await this.keyStore.getKey();
    const json = decrypt(enc, key).toString("utf8");
    return normalizeStore(JSON.parse(json));
  }

  async save(store: Store): Promise<void> {
    const key = await this.keyStore.getKey();
    const enc = encrypt(Buffer.from(JSON.stringify(store), "utf8"), key);
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(enc), "utf8");
    await rename(tmp, this.filePath);
    await this.afterSave?.(this.filePath);
  }

  async list(): Promise<Secret[]> {
    return (await this.load()).secrets;
  }

  async add(input: SecretInput): Promise<Secret> {
    const store = await this.load();
    const now = Date.now();
    const secret: Secret = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    store.secrets.push(secret);
    registerTags(store, secret.tags);
    await this.save(store);
    return secret;
  }

  async update(id: string, patch: Partial<SecretInput>): Promise<Secret> {
    const store = await this.load();
    const secret = this.require(store, id);
    Object.assign(secret, patch, { updatedAt: Date.now() });
    if (patch.tags) registerTags(store, patch.tags);
    await this.save(store);
    return secret;
  }

  // All known tags, sorted by name. Backfills any tag already used by a secret
  // but missing from the catalog (stores created before the catalog existed).
  async listTags(): Promise<TagInfo[]> {
    const store = await this.load();
    const used = new Set(store.secrets.flatMap((s) => s.tags));
    if (registerTags(store, [...used])) await this.save(store);
    return [...store.tags].sort((a, b) => a.name.localeCompare(b.name));
  }

  async remove(id: string): Promise<void> {
    const store = await this.load();
    store.secrets = store.secrets.filter((s) => s.id !== id);
    await this.save(store);
  }

  async setTags(id: string, tags: string[]): Promise<Secret> {
    return this.update(id, { tags });
  }

  async move(id: string, folder: string[]): Promise<Secret> {
    return this.update(id, { folder });
  }

  async createFolder(path: string[]): Promise<void> {
    const store = await this.load();
    if (!store.folders.some((f) => sameFolder(f, path))) store.folders.push(path);
    await this.save(store);
  }

  async folderTree(): Promise<string[][]> {
    const store = await this.load();
    const seen = new Map<string, string[]>();
    const addPrefixes = (path: string[]) => {
      for (let i = 1; i <= path.length; i++) {
        const prefix = path.slice(0, i);
        seen.set(JSON.stringify(prefix), prefix);
      }
    };
    store.folders.forEach(addPrefixes);
    store.secrets.forEach((s) => addPrefixes(s.folder));
    return [...seen.values()];
  }

  private require(store: Store, id: string): Secret {
    const secret = store.secrets.find((s) => s.id === id);
    if (!secret) throw new Error(`Secret not found: ${id}`);
    return secret;
  }
}

function sameFolder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

// Add any tag names not already in the catalog. Returns true if it changed.
function registerTags(store: Store, names: string[]): boolean {
  const known = new Set(store.tags.map((t) => t.name));
  let changed = false;
  for (const name of names) {
    if (!name || known.has(name)) continue;
    store.tags.push({ name });
    known.add(name);
    changed = true;
  }
  return changed;
}
