# Secrets Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A macOS Raycast extension that stores secrets in one AES-256-GCM–encrypted local file, keyed by a random data key held in the macOS Keychain, with nested folders, tags, export/import, and automatic backups.

**Architecture:** Four testable core modules under `src/lib/` — `keystore` (Keychain via `security` CLI), `crypto` (AES-256-GCM), `store` (whole-blob load/save + CRUD + folders/tags), `backup` and `portable` (export/import) — are consumed by thin Raycast command files. The store re-encrypts the whole small blob on every write and runs an injected backup callback after each save.

**Tech Stack:** TypeScript, Node built-ins (`node:crypto`, `node:child_process`, `node:fs/promises`), `@raycast/api`, `@raycast/utils`, `vitest` for unit tests.

## Global Constraints

- Platform: **macOS only**. Remove `"Windows"` from `platforms` in `package.json`.
- Encryption: **AES-256-GCM**, random 12-byte IV per write, 16-byte auth tag.
- Data key: **32 random bytes** in macOS Keychain, service `raycast-secrets-manager`, account `data-key`, stored base64. Never written to the store file.
- Storage: single file `secrets.enc` in `environment.supportPath`. Whole-store encrypt; **atomic writes** (temp file + rename).
- No new runtime dependencies beyond `@raycast/api` / `@raycast/utils`. Use `crypto.randomUUID()` (no `uuid` package). `vitest` is a devDependency only.
- Unit tests import `describe/it/expect` explicitly from `"vitest"` (no globals config).
- Commits: Conventional Commits (`type(scope): summary`).

---

## File Structure

```
src/
  lib/
    types.ts          // Secret, Store, emptyStore
    crypto.ts         // Encrypted, encrypt(), decrypt()
    crypto.test.ts
    keystore.ts       // KeyStore interface, KeychainKeyStore, MemoryKeyStore
    keystore.test.ts  // real-Keychain test behind RUN_KEYCHAIN_TESTS flag
    store.ts          // SecretsStore
    store.test.ts
    backup.ts         // BackupConfig, runBackup()
    backup.test.ts
    portable.ts       // exportPlain/exportEncrypted/importData
    portable.test.ts
    prefs.ts          // read Raycast preferences -> BackupConfig + build afterSave
  manage-secrets.tsx  // view: List hub
  add-secret.tsx      // view: Form
  export-secrets.tsx  // no-view
  import-secrets.tsx  // no-view
  daily-backup.ts     // no-view, interval 1d
docs/superpowers/...   // spec + this plan
package.json           // manifest + vitest
```

`src/secrets-manager.ts` (the scaffold stub) is deleted in Task 8 when the real commands replace it.

---

### Task 1: Test infra, types, platform fix

**Files:**
- Modify: `package.json` (remove Windows platform; add `vitest` devDep + `test` script)
- Create: `src/lib/types.ts`
- Create: `src/lib/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Secret = { id: string; name: string; value: string; folder: string[]; tags: string[]; createdAt: number; updatedAt: number }`
  - `type Store = { version: 1; secrets: Secret[]; folders: string[][] }`
  - `function emptyStore(): Store`

- [ ] **Step 1: Remove Windows from platforms**

In `package.json` change:
```json
  "platforms": [
    "macOS"
  ],
```

- [ ] **Step 2: Add vitest devDependency and test script**

In `package.json` add to `devDependencies`:
```json
    "vitest": "^3.0.0"
```
And to `scripts`:
```json
    "test": "vitest run"
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: exits 0, `node_modules/.bin/vitest` exists.

- [ ] **Step 4: Write types + emptyStore**

Create `src/lib/types.ts`:
```ts
export type Secret = {
  id: string;
  name: string;
  value: string;
  folder: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type Store = {
  version: 1;
  secrets: Secret[];
  folders: string[][];
};

export function emptyStore(): Store {
  return { version: 1, secrets: [], folders: [] };
}
```

- [ ] **Step 5: Write the test**

Create `src/lib/types.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { emptyStore } from "./types";

describe("emptyStore", () => {
  it("returns a fresh empty store each call", () => {
    const a = emptyStore();
    const b = emptyStore();
    expect(a).toEqual({ version: 1, secrets: [], folders: [] });
    a.secrets.push({
      id: "x", name: "n", value: "v", folder: [], tags: [],
      createdAt: 0, updatedAt: 0,
    });
    expect(b.secrets).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 1 file, all passing.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/types.ts src/lib/types.test.ts
git commit -m "chore: add vitest, types, macOS-only platform"
```

---

### Task 2: Crypto (AES-256-GCM)

**Files:**
- Create: `src/lib/crypto.ts`
- Create: `src/lib/crypto.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Encrypted = { v: 1; iv: string; tag: string; data: string }` (all base64)
  - `function encrypt(plaintext: Buffer, key: Buffer): Encrypted`
  - `function decrypt(enc: Encrypted, key: Buffer): Buffer` (throws on tamper/wrong key)

- [ ] **Step 1: Write the failing test**

Create `src/lib/crypto.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "./crypto";

const key = randomBytes(32);

describe("crypto", () => {
  it("round-trips plaintext", () => {
    const pt = Buffer.from("hunter2 🔐", "utf8");
    const back = decrypt(encrypt(pt, key), key);
    expect(back.toString("utf8")).toBe("hunter2 🔐");
  });

  it("uses a fresh iv per call", () => {
    const pt = Buffer.from("same", "utf8");
    expect(encrypt(pt, key).iv).not.toBe(encrypt(pt, key).iv);
  });

  it("throws when the auth tag is tampered", () => {
    const enc = encrypt(Buffer.from("data"), key);
    const bad = Buffer.from(enc.tag, "base64");
    bad[0] ^= 0xff;
    expect(() => decrypt({ ...enc, tag: bad.toString("base64") }, key)).toThrow();
  });

  it("throws with the wrong key", () => {
    const enc = encrypt(Buffer.from("data"), key);
    expect(() => decrypt(enc, randomBytes(32))).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/crypto.test.ts`
Expected: FAIL — cannot find module `./crypto`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/crypto.ts`:
```ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export type Encrypted = { v: 1; iv: string; tag: string; data: string };

export function encrypt(plaintext: Buffer, key: Buffer): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
}

export function decrypt(enc: Encrypted, key: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(enc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(enc.data, "base64")),
    decipher.final(),
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/crypto.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto.ts src/lib/crypto.test.ts
git commit -m "feat(crypto): aes-256-gcm encrypt/decrypt with tamper detection"
```

---

### Task 3: KeyStore (Keychain)

**Files:**
- Create: `src/lib/keystore.ts`
- Create: `src/lib/keystore.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface KeyStore { getKey(): Promise<Buffer>; hasKey(): Promise<boolean> }`
  - `class KeychainKeyStore implements KeyStore` — reads/creates the 32-byte key in Keychain (service `raycast-secrets-manager`, account `data-key`) via the `security` CLI.
  - `class MemoryKeyStore implements KeyStore` — fixed in-memory key for tests of other modules.

- [ ] **Step 1: Write the test**

Create `src/lib/keystore.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { MemoryKeyStore, KeychainKeyStore } from "./keystore";

describe("MemoryKeyStore", () => {
  it("returns a stable 32-byte key", async () => {
    const ks = new MemoryKeyStore();
    const a = await ks.getKey();
    const b = await ks.getKey();
    expect(a).toHaveLength(32);
    expect(a.equals(b)).toBe(true);
    expect(await ks.hasKey()).toBe(true);
  });
});

// Real Keychain test mutates the login keychain; run explicitly:
//   RUN_KEYCHAIN_TESTS=1 npx vitest run src/lib/keystore.test.ts
describe.runIf(process.env.RUN_KEYCHAIN_TESTS)("KeychainKeyStore", () => {
  it("creates then returns the same key", async () => {
    const ks = new KeychainKeyStore("raycast-secrets-manager-test");
    const a = await ks.getKey();
    const b = await ks.getKey();
    expect(a).toHaveLength(32);
    expect(a.equals(b)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/keystore.test.ts`
Expected: FAIL — cannot find module `./keystore`.

- [ ] **Step 3: Write implementation**

Create `src/lib/keystore.ts`:
```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";

const run = promisify(execFile);

export interface KeyStore {
  getKey(): Promise<Buffer>;
  hasKey(): Promise<boolean>;
}

export class MemoryKeyStore implements KeyStore {
  constructor(private key: Buffer = Buffer.alloc(32, 7)) {}
  async getKey(): Promise<Buffer> {
    return this.key;
  }
  async hasKey(): Promise<boolean> {
    return true;
  }
}

const ACCOUNT = "data-key";

export class KeychainKeyStore implements KeyStore {
  constructor(private service = "raycast-secrets-manager") {}

  async hasKey(): Promise<boolean> {
    try {
      await this.find();
      return true;
    } catch {
      return false;
    }
  }

  async getKey(): Promise<Buffer> {
    try {
      return await this.find();
    } catch {
      return this.create();
    }
  }

  private async find(): Promise<Buffer> {
    // -w prints only the password value
    const { stdout } = await run("security", [
      "find-generic-password",
      "-s", this.service,
      "-a", ACCOUNT,
      "-w",
    ]);
    return Buffer.from(stdout.trim(), "base64");
  }

  private async create(): Promise<Buffer> {
    const key = randomBytes(32);
    await run("security", [
      "add-generic-password",
      "-s", this.service,
      "-a", ACCOUNT,
      "-w", key.toString("base64"),
      "-U", // update if it already exists
    ]);
    return key;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/keystore.test.ts`
Expected: PASS — MemoryKeyStore test passes; KeychainKeyStore suite skipped.

- [ ] **Step 5 (optional): Verify against real Keychain**

Run: `RUN_KEYCHAIN_TESTS=1 npx vitest run src/lib/keystore.test.ts`
Expected: PASS. Cleanup: `security delete-generic-password -s raycast-secrets-manager-test -a data-key`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/keystore.ts src/lib/keystore.test.ts
git commit -m "feat(keystore): keychain-backed data key with memory fake"
```

---

### Task 4: SecretsStore (file + CRUD + folders)

**Files:**
- Create: `src/lib/store.ts`
- Create: `src/lib/store.test.ts`

**Interfaces:**
- Consumes: `KeyStore` (Task 3), `encrypt`/`decrypt`/`Encrypted` (Task 2), `Store`/`Secret`/`emptyStore` (Task 1).
- Produces:
  - `type SecretInput = { name: string; value: string; folder: string[]; tags: string[] }`
  - `class SecretsStore` with:
    - `constructor(filePath: string, keyStore: KeyStore, afterSave?: (filePath: string) => Promise<void>)`
    - `load(): Promise<Store>`
    - `save(store: Store): Promise<void>` — atomic write, then `await afterSave?.(filePath)`
    - `list(): Promise<Secret[]>`
    - `add(input: SecretInput): Promise<Secret>`
    - `update(id: string, patch: Partial<SecretInput>): Promise<Secret>`
    - `remove(id: string): Promise<void>`
    - `setTags(id: string, tags: string[]): Promise<Secret>`
    - `move(id: string, folder: string[]): Promise<Secret>`
    - `createFolder(path: string[]): Promise<void>`
    - `folderTree(): Promise<string[][]>` — union of explicit `folders` and every prefix of each secret's `folder`

- [ ] **Step 1: Write the failing test**

Create `src/lib/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryKeyStore } from "./keystore";
import { SecretsStore } from "./store";

let dir: string;
let store: SecretsStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "secmgr-"));
  store = new SecretsStore(join(dir, "secrets.enc"), new MemoryKeyStore());
});

describe("SecretsStore", () => {
  it("loads an empty store when no file exists", async () => {
    const s = await store.load();
    expect(s.secrets).toEqual([]);
  });

  it("adds and persists a secret encrypted (file is not plaintext)", async () => {
    const sec = await store.add({ name: "API", value: "sk-123", folder: ["work"], tags: ["prod"] });
    expect(sec.id).toBeTruthy();
    const raw = await (await import("node:fs/promises")).readFile(join(dir, "secrets.enc"), "utf8");
    expect(raw).not.toContain("sk-123");
    const reloaded = await new SecretsStore(join(dir, "secrets.enc"), new MemoryKeyStore()).list();
    expect(reloaded[0].value).toBe("sk-123");
  });

  it("updates, sets tags, moves, and removes", async () => {
    const sec = await store.add({ name: "n", value: "v", folder: [], tags: [] });
    await store.update(sec.id, { value: "v2" });
    await store.setTags(sec.id, ["dev"]);
    const moved = await store.move(sec.id, ["work", "dev"]);
    expect(moved.value).toBe("v2");
    expect(moved.tags).toEqual(["dev"]);
    expect(moved.folder).toEqual(["work", "dev"]);
    await store.remove(sec.id);
    expect(await store.list()).toEqual([]);
  });

  it("persists empty folders and builds the folder tree with prefixes", async () => {
    await store.createFolder(["work", "dev"]);
    await store.add({ name: "n", value: "v", folder: ["personal", "keys"], tags: [] });
    const tree = await store.folderTree();
    expect(tree).toContainEqual(["work"]);
    expect(tree).toContainEqual(["work", "dev"]);
    expect(tree).toContainEqual(["personal"]);
    expect(tree).toContainEqual(["personal", "keys"]);
  });

  it("runs the afterSave hook once per save", async () => {
    let calls = 0;
    const s = new SecretsStore(join(dir, "s2.enc"), new MemoryKeyStore(), async () => { calls++; });
    await s.add({ name: "n", value: "v", folder: [], tags: [] });
    expect(calls).toBe(1);
  });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
import { afterEach } from "vitest";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/store.test.ts`
Expected: FAIL — cannot find module `./store`.

- [ ] **Step 3: Write implementation**

Create `src/lib/store.ts`:
```ts
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { KeyStore } from "./keystore";
import { encrypt, decrypt, Encrypted } from "./crypto";
import { Store, Secret, emptyStore } from "./types";

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
    return JSON.parse(json) as Store;
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
    await this.save(store);
    return secret;
  }

  async update(id: string, patch: Partial<SecretInput>): Promise<Secret> {
    const store = await this.load();
    const secret = this.require(store, id);
    Object.assign(secret, patch, { updatedAt: Date.now() });
    await this.save(store);
    return secret;
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
        seen.set(prefix.join(" "), prefix);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.ts src/lib/store.test.ts
git commit -m "feat(store): encrypted file store with crud, folders, tags"
```

---

### Task 5: Backup + retention

**Files:**
- Create: `src/lib/backup.ts`
- Create: `src/lib/backup.test.ts`

**Interfaces:**
- Consumes: nothing (operates on a file path).
- Produces:
  - `type BackupConfig = { enabled: boolean; dir: string; retention: number }`
  - `function runBackup(sourceFile: string, cfg: BackupConfig, now?: number): Promise<void>` — no-op if `!enabled` or source missing; else copies to `dir/secrets-<now>.enc` and prunes to the newest `retention` backups.

- [ ] **Step 1: Write the failing test**

Create `src/lib/backup.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBackup } from "./backup";

let dir: string;
let src: string;
let backups: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bak-"));
  src = join(dir, "secrets.enc");
  backups = join(dir, "backups");
  await writeFile(src, "encrypted-bytes", "utf8");
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe("runBackup", () => {
  it("does nothing when disabled", async () => {
    await runBackup(src, { enabled: false, dir: backups, retention: 5 }, 1000);
    await expect(readdir(backups)).rejects.toThrow();
  });

  it("writes a timestamped copy", async () => {
    await runBackup(src, { enabled: true, dir: backups, retention: 5 }, 1000);
    expect(await readdir(backups)).toEqual(["secrets-1000.enc"]);
  });

  it("prunes to the newest N backups", async () => {
    for (const t of [1, 2, 3, 4]) {
      await runBackup(src, { enabled: true, dir: backups, retention: 2 }, t);
    }
    const files = (await readdir(backups)).sort();
    expect(files).toEqual(["secrets-3.enc", "secrets-4.enc"]);
  });

  it("no-ops when the source file is missing", async () => {
    await runBackup(join(dir, "nope.enc"), { enabled: true, dir: backups, retention: 5 }, 1000);
    await expect(readdir(backups)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/backup.test.ts`
Expected: FAIL — cannot find module `./backup`.

- [ ] **Step 3: Write implementation**

Create `src/lib/backup.ts`:
```ts
import { mkdir, copyFile, readdir, rm, access } from "node:fs/promises";
import { join } from "node:path";

export type BackupConfig = { enabled: boolean; dir: string; retention: number };

export async function runBackup(
  sourceFile: string,
  cfg: BackupConfig,
  now: number = Date.now(),
): Promise<void> {
  if (!cfg.enabled) return;
  try {
    await access(sourceFile);
  } catch {
    return;
  }
  await mkdir(cfg.dir, { recursive: true });
  await copyFile(sourceFile, join(cfg.dir, `secrets-${now}.enc`));
  await prune(cfg.dir, cfg.retention);
}

async function prune(dir: string, retention: number): Promise<void> {
  const files = (await readdir(dir))
    .filter((f) => /^secrets-\d+\.enc$/.test(f))
    .sort((a, b) => stamp(a) - stamp(b));
  const excess = files.length - retention;
  for (let i = 0; i < excess; i++) {
    await rm(join(dir, files[i]), { force: true });
  }
}

function stamp(file: string): number {
  return Number(file.replace(/^secrets-(\d+)\.enc$/, "$1"));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/backup.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/backup.ts src/lib/backup.test.ts
git commit -m "feat(backup): timestamped backups with retention pruning"
```

---

### Task 6: Export / import (portable)

**Files:**
- Create: `src/lib/portable.ts`
- Create: `src/lib/portable.test.ts`

**Interfaces:**
- Consumes: `Store` (Task 1), `encrypt`/`decrypt`/`Encrypted` (Task 2).
- Produces:
  - `function exportPlain(store: Store): string` — pretty JSON of the store.
  - `function exportEncrypted(store: Store, passphrase: string): string` — JSON `{ format: "secmgr-encrypted-v1"; salt; iv; tag; data }`, key = `scryptSync(passphrase, salt, 32)`.
  - `function importData(text: string, passphrase?: string): Store` — detects encrypted (has `format: "secmgr-encrypted-v1"`) vs plain; throws `Error("passphrase required")` if encrypted and none given.

- [ ] **Step 1: Write the failing test**

Create `src/lib/portable.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { exportPlain, exportEncrypted, importData } from "./portable";
import { emptyStore, Store } from "./types";

function sample(): Store {
  const s = emptyStore();
  s.secrets.push({
    id: "1", name: "API", value: "sk-123", folder: ["work"], tags: ["prod"],
    createdAt: 1, updatedAt: 1,
  });
  return s;
}

describe("portable", () => {
  it("plain export round-trips", () => {
    const text = exportPlain(sample());
    expect(text).toContain("sk-123");
    expect(importData(text).secrets[0].value).toBe("sk-123");
  });

  it("encrypted export hides the value and round-trips with the passphrase", () => {
    const text = exportEncrypted(sample(), "correct horse");
    expect(text).not.toContain("sk-123");
    expect(importData(text, "correct horse").secrets[0].value).toBe("sk-123");
  });

  it("wrong passphrase throws", () => {
    const text = exportEncrypted(sample(), "correct horse");
    expect(() => importData(text, "wrong")).toThrow();
  });

  it("encrypted import without a passphrase throws a clear error", () => {
    const text = exportEncrypted(sample(), "pw");
    expect(() => importData(text)).toThrow(/passphrase required/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/portable.test.ts`
Expected: FAIL — cannot find module `./portable`.

- [ ] **Step 3: Write implementation**

Create `src/lib/portable.ts`:
```ts
import { randomBytes, scryptSync } from "node:crypto";
import { encrypt, decrypt, Encrypted } from "./crypto";
import { Store } from "./types";

const FORMAT = "secmgr-encrypted-v1";

type EncryptedExport = Encrypted & { format: typeof FORMAT; salt: string };

export function exportPlain(store: Store): string {
  return JSON.stringify(store, null, 2);
}

export function exportEncrypted(store: Store, passphrase: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(passphrase, salt, 32);
  const enc = encrypt(Buffer.from(JSON.stringify(store), "utf8"), key);
  const out: EncryptedExport = { format: FORMAT, salt: salt.toString("base64"), ...enc };
  return JSON.stringify(out);
}

export function importData(text: string, passphrase?: string): Store {
  const parsed = JSON.parse(text) as unknown;
  if (isEncryptedExport(parsed)) {
    if (!passphrase) throw new Error("passphrase required");
    const key = scryptSync(passphrase, Buffer.from(parsed.salt, "base64"), 32);
    const json = decrypt(parsed, key).toString("utf8");
    return JSON.parse(json) as Store;
  }
  return parsed as Store;
}

function isEncryptedExport(v: unknown): v is EncryptedExport {
  return typeof v === "object" && v !== null && (v as { format?: string }).format === FORMAT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/portable.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: all lib test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/portable.ts src/lib/portable.test.ts
git commit -m "feat(portable): encrypted and plain export/import"
```

---

### Task 7: Preferences + wiring helper

**Files:**
- Modify: `package.json` (add extension-level `preferences`)
- Create: `src/lib/prefs.ts`
- Create: `src/lib/prefs.test.ts`

**Interfaces:**
- Consumes: `BackupConfig` (Task 5), `runBackup` (Task 5).
- Produces:
  - `function backupConfigFrom(raw: { enableBackups?: boolean; backupDir?: string; retention?: string }, defaultDir: string): BackupConfig`
  - `function makeAfterSave(cfg: BackupConfig): (filePath: string) => Promise<void>`

- [ ] **Step 1: Add preferences to the manifest**

In `package.json`, add a top-level `"preferences"` array (sibling of `"commands"`):
```json
  "preferences": [
    {
      "name": "enableBackups",
      "title": "Backups",
      "label": "Enable automatic backups after each change",
      "description": "Write a timestamped encrypted backup after every change",
      "type": "checkbox",
      "required": false,
      "default": true
    },
    {
      "name": "backupDir",
      "title": "Backup Folder",
      "description": "Folder for backups (defaults to the extension support folder)",
      "type": "directory",
      "required": false
    },
    {
      "name": "retention",
      "title": "Backup Retention",
      "description": "How many backups to keep",
      "type": "textfield",
      "required": false,
      "default": "10",
      "placeholder": "10"
    },
    {
      "name": "dailyBackup",
      "title": "Daily Backup",
      "label": "Enable daily scheduled backup",
      "description": "Take one background snapshot per day",
      "type": "checkbox",
      "required": false,
      "default": true
    }
  ],
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/prefs.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { backupConfigFrom } from "./prefs";

describe("backupConfigFrom", () => {
  it("uses defaults when fields are empty", () => {
    const cfg = backupConfigFrom({}, "/support/backups");
    expect(cfg).toEqual({ enabled: true, dir: "/support/backups", retention: 10 });
  });

  it("honors provided values", () => {
    const cfg = backupConfigFrom(
      { enableBackups: false, backupDir: "/custom", retention: "3" },
      "/support/backups",
    );
    expect(cfg).toEqual({ enabled: false, dir: "/custom", retention: 3 });
  });

  it("falls back to default retention on non-numeric input", () => {
    expect(backupConfigFrom({ retention: "abc" }, "/d").retention).toBe(10);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/prefs.test.ts`
Expected: FAIL — cannot find module `./prefs`.

- [ ] **Step 4: Write implementation**

Create `src/lib/prefs.ts`:
```ts
import { BackupConfig, runBackup } from "./backup";

type RawPrefs = {
  enableBackups?: boolean;
  backupDir?: string;
  retention?: string;
};

export function backupConfigFrom(raw: RawPrefs, defaultDir: string): BackupConfig {
  const retention = Number.parseInt(raw.retention ?? "", 10);
  return {
    enabled: raw.enableBackups ?? true,
    dir: raw.backupDir && raw.backupDir.trim() ? raw.backupDir : defaultDir,
    retention: Number.isFinite(retention) && retention > 0 ? retention : 10,
  };
}

export function makeAfterSave(cfg: BackupConfig): (filePath: string) => Promise<void> {
  return (filePath) => runBackup(filePath, cfg);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/prefs.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json src/lib/prefs.ts src/lib/prefs.test.ts
git commit -m "feat(prefs): backup preferences and afterSave wiring"
```

---

### Task 8: Manage Secrets command (List hub) + Add Secret form

**Files:**
- Modify: `package.json` (replace the scaffold command with real commands)
- Delete: `src/secrets-manager.ts`
- Create: `src/lib/context.ts` (shared store factory)
- Create: `src/manage-secrets.tsx`
- Create: `src/add-secret.tsx`

**Interfaces:**
- Consumes: `SecretsStore` (Task 4), `KeychainKeyStore` (Task 3), `backupConfigFrom`/`makeAfterSave` (Task 7), `@raycast/api`.
- Produces:
  - `function getStore(): SecretsStore` in `src/lib/context.ts` — builds a `SecretsStore` from `environment.supportPath`, a `KeychainKeyStore`, and preference-driven `afterSave`.

> UI tasks are verified manually with `npm run dev` (`ray develop`), not with vitest. Raycast opens the command in development; check each action by hand.

- [ ] **Step 1: Replace the manifest commands**

In `package.json` replace the whole `"commands"` array with:
```json
  "commands": [
    {
      "name": "manage-secrets",
      "title": "Manage Secrets",
      "description": "Browse, copy, edit, tag and organize secrets",
      "mode": "view"
    },
    {
      "name": "add-secret",
      "title": "Add Secret",
      "description": "Add a new secret",
      "mode": "view"
    },
    {
      "name": "export-secrets",
      "title": "Export Secrets",
      "description": "Export secrets (encrypted or plain JSON)",
      "mode": "no-view"
    },
    {
      "name": "import-secrets",
      "title": "Import Secrets",
      "description": "Import secrets from a file",
      "mode": "no-view"
    },
    {
      "name": "daily-backup",
      "title": "Daily Backup",
      "description": "Daily encrypted backup of the secrets store",
      "mode": "no-view",
      "interval": "1d"
    }
  ],
```

- [ ] **Step 2: Delete the scaffold entry point**

Run: `git rm src/secrets-manager.ts`

- [ ] **Step 3: Create the shared store factory**

Create `src/lib/context.ts`:
```ts
import { join } from "node:path";
import { environment, getPreferenceValues } from "@raycast/api";
import { SecretsStore } from "./store";
import { KeychainKeyStore } from "./keystore";
import { backupConfigFrom, makeAfterSave } from "./prefs";

export function getStore(): SecretsStore {
  const prefs = getPreferenceValues<{
    enableBackups?: boolean;
    backupDir?: string;
    retention?: string;
  }>();
  const defaultDir = join(environment.supportPath, "backups");
  const cfg = backupConfigFrom(prefs, defaultDir);
  const filePath = join(environment.supportPath, "secrets.enc");
  return new SecretsStore(filePath, new KeychainKeyStore(), makeAfterSave(cfg));
}
```

- [ ] **Step 4: Create the Add Secret form**

Create `src/add-secret.tsx`:
```tsx
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getStore } from "./lib/context";

function splitList(input: string): string[] {
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}

function splitFolder(input: string): string[] {
  return input.split("/").map((s) => s.trim()).filter(Boolean);
}

export default function AddSecret() {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { name: string; value: string; folder: string; tags: string }) {
    if (!values.name.trim() || !values.value.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name and value are required" });
      return;
    }
    setLoading(true);
    try {
      await getStore().add({
        name: values.name.trim(),
        value: values.value,
        folder: splitFolder(values.folder),
        tags: splitList(values.tags),
      });
      await showToast({ style: Toast.Style.Success, title: "Secret added" });
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="AWS Access Key" />
      <Form.PasswordField id="value" title="Value" placeholder="secret value" />
      <Form.TextField id="folder" title="Folder" placeholder="work/dev" />
      <Form.TextField id="tags" title="Tags" placeholder="prod, aws" />
    </Form>
  );
}
```

- [ ] **Step 5: Create the Manage Secrets list hub**

Create `src/manage-secrets.tsx`:
```tsx
import {
  Action, ActionPanel, Clipboard, Icon, List, confirmAlert, showToast, Toast, useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getStore } from "./lib/context";
import type { Secret } from "./lib/types";
import AddSecret from "./add-secret";

function useSecrets() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  async function reload() {
    setLoading(true);
    try {
      setSecrets(await getStore().list());
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load", message: String(e) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  return { secrets, loading, reload };
}

export default function ManageSecrets() {
  const { secrets, loading, reload } = useSecrets();
  const { push } = useNavigation();
  const [tag, setTag] = useState<string>("all");

  const allTags = [...new Set(secrets.flatMap((s) => s.tags))].sort();
  const shown = tag === "all" ? secrets : secrets.filter((s) => s.tags.includes(tag));

  async function copy(secret: Secret) {
    await Clipboard.copy(secret.value, { concealed: true });
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  }

  async function remove(secret: Secret) {
    const ok = await confirmAlert({ title: `Delete "${secret.name}"?` });
    if (!ok) return;
    await getStore().remove(secret.id);
    await reload();
  }

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" value={tag} onChange={setTag}>
          <List.Dropdown.Item title="All tags" value="all" />
          {allTags.map((t) => (
            <List.Dropdown.Item key={t} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {shown.map((secret) => (
        <List.Item
          key={secret.id}
          title={secret.name}
          subtitle={secret.folder.join("/")}
          accessories={secret.tags.map((t) => ({ tag: t }))}
          actions={
            <ActionPanel>
              <Action title="Copy Value" icon={Icon.Clipboard} onAction={() => copy(secret)} />
              <Action.Push title="Add Secret" icon={Icon.Plus} target={<AddSecret />} onPop={reload} />
              <Action
                title="Delete Secret"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(secret)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npm run lint`
Expected: no errors. Fix any type issues before continuing.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`
Then in Raycast: run **Add Secret** (add `name=API`, `value=sk-123`, `folder=work/dev`, `tags=prod`). Run **Manage Secrets**: the item appears with subtitle `work/dev` and a `prod` tag; the tag dropdown filters it; Copy Value copies; Delete removes it after confirm. Stop dev with Ctrl-C.

- [ ] **Step 8: Commit**

```bash
git add package.json src/lib/context.ts src/manage-secrets.tsx src/add-secret.tsx
git commit -m "feat(ui): manage-secrets list hub and add-secret form"
```

---

### Task 8b: Folder navigation + edit/move UI

**Files:**
- Create: `src/components/secret-form.tsx` (reusable add/edit form)
- Modify: `src/add-secret.tsx` (use the shared form)
- Modify: `src/manage-secrets.tsx` (recursive folder navigation + Edit action)

**Interfaces:**
- Consumes: `getStore` (Task 8), `Secret` (Task 1), `@raycast/api`.
- Produces:
  - `function SecretForm(props: { secret?: Secret; onSaved?: () => void }): JSX.Element` — adds when `secret` is undefined, updates (name/value/folder/tags — covers move + retag) when present.
  - `function childFolders(tree: string[][], path: string[]): string[][]`
  - `function secretsAt(secrets: Secret[], path: string[]): Secret[]`

> UI task — verified manually with `npm run dev`.

- [ ] **Step 1: Create the reusable form**

Create `src/components/secret-form.tsx`:
```tsx
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getStore } from "../lib/context";
import type { Secret } from "../lib/types";

function splitList(input: string): string[] {
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}
function splitFolder(input: string): string[] {
  return input.split("/").map((s) => s.trim()).filter(Boolean);
}

export function SecretForm({ secret, onSaved }: { secret?: Secret; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { name: string; value: string; folder: string; tags: string }) {
    if (!values.name.trim() || !values.value.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name and value are required" });
      return;
    }
    setLoading(true);
    try {
      const store = getStore();
      const input = {
        name: values.name.trim(),
        value: values.value,
        folder: splitFolder(values.folder),
        tags: splitList(values.tags),
      };
      if (secret) await store.update(secret.id, input);
      else await store.add(input);
      await showToast({ style: Toast.Style.Success, title: secret ? "Secret updated" : "Secret added" });
      onSaved?.();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={secret ? "Save Changes" : "Save Secret"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={secret?.name} placeholder="AWS Access Key" />
      <Form.PasswordField id="value" title="Value" defaultValue={secret?.value} placeholder="secret value" />
      <Form.TextField id="folder" title="Folder" defaultValue={secret?.folder.join("/")} placeholder="work/dev" />
      <Form.TextField id="tags" title="Tags" defaultValue={secret?.tags.join(", ")} placeholder="prod, aws" />
    </Form>
  );
}
```

- [ ] **Step 2: Point Add Secret at the shared form**

Replace the whole contents of `src/add-secret.tsx`:
```tsx
import { SecretForm } from "./components/secret-form";

export default function AddSecret() {
  return <SecretForm />;
}
```

- [ ] **Step 3: Rewrite Manage Secrets with folder navigation**

Replace the whole contents of `src/manage-secrets.tsx`:
```tsx
import {
  Action, ActionPanel, Clipboard, Icon, List, confirmAlert, showToast, Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getStore } from "./lib/context";
import type { Secret } from "./lib/types";
import { SecretForm } from "./components/secret-form";

type Data = { secrets: Secret[]; tree: string[][] };

export function childFolders(tree: string[][], path: string[]): string[][] {
  return tree.filter(
    (f) => f.length === path.length + 1 && path.every((p, i) => f[i] === p),
  );
}
export function secretsAt(secrets: Secret[], path: string[]): Secret[] {
  return secrets.filter(
    (s) => s.folder.length === path.length && path.every((p, i) => s.folder[i] === p),
  );
}

function useData() {
  const [data, setData] = useState<Data>({ secrets: [], tree: [] });
  const [loading, setLoading] = useState(true);
  async function reload() {
    setLoading(true);
    try {
      const store = getStore();
      const [secrets, tree] = await Promise.all([store.list(), store.folderTree()]);
      setData({ secrets, tree });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load", message: String(e) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  return { data, loading, reload };
}

function SecretItem({ secret, reload }: { secret: Secret; reload: () => void }) {
  async function copy() {
    await Clipboard.copy(secret.value, { concealed: true });
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  }
  async function remove() {
    if (!(await confirmAlert({ title: `Delete "${secret.name}"?` }))) return;
    await getStore().remove(secret.id);
    reload();
  }
  return (
    <List.Item
      title={secret.name}
      subtitle={secret.folder.join("/")}
      accessories={secret.tags.map((t) => ({ tag: t }))}
      actions={
        <ActionPanel>
          <Action title="Copy Value" icon={Icon.Clipboard} onAction={copy} />
          <Action.Push
            title="Edit Secret"
            icon={Icon.Pencil}
            target={<SecretForm secret={secret} onSaved={reload} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.Push title="Add Secret" icon={Icon.Plus} target={<SecretForm onSaved={reload} />} />
          <Action
            title="Delete Secret"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={remove}
          />
        </ActionPanel>
      }
    />
  );
}

function FolderView({ path }: { path: string[] }) {
  const { data, loading, reload } = useData();
  const [tag, setTag] = useState("all");

  const allTags = [...new Set(data.secrets.flatMap((s) => s.tags))].sort();

  // Tag filter is global and flat; folder navigation applies only when no tag is selected.
  if (tag !== "all") {
    const filtered = data.secrets.filter((s) => s.tags.includes(tag));
    return (
      <List isLoading={loading} searchBarAccessory={tagDropdown(tag, setTag, allTags)}>
        {filtered.map((s) => (
          <SecretItem key={s.id} secret={s} reload={reload} />
        ))}
      </List>
    );
  }

  const folders = childFolders(data.tree, path);
  const secrets = secretsAt(data.secrets, path);

  return (
    <List
      isLoading={loading}
      navigationTitle={path.length ? path.join("/") : "Secrets"}
      searchBarAccessory={path.length === 0 ? tagDropdown(tag, setTag, allTags) : undefined}
    >
      <List.Section title="Folders">
        {folders.map((f) => (
          <List.Item
            key={f.join("/")}
            title={f[f.length - 1]}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action.Push title="Open Folder" icon={Icon.Folder} target={<FolderView path={f} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Secrets">
        {secrets.map((s) => (
          <SecretItem key={s.id} secret={s} reload={reload} />
        ))}
      </List.Section>
    </List>
  );
}

function tagDropdown(tag: string, setTag: (t: string) => void, allTags: string[]) {
  return (
    <List.Dropdown tooltip="Filter by tag" value={tag} onChange={setTag}>
      <List.Dropdown.Item title="All tags" value="all" />
      {allTags.map((t) => (
        <List.Dropdown.Item key={t} title={t} value={t} />
      ))}
    </List.Dropdown>
  );
}

export default function ManageSecrets() {
  return <FolderView path={[]} />;
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Add secrets in `work/dev` and `work/prod` and at root. In **Manage Secrets**: root shows a `work` folder + root secrets; opening `work` shows `dev` and `prod` subfolders; opening `dev` shows its secret. `Cmd-E` edits a secret; change its folder to `personal` and confirm it moves; change its tags and confirm the accessory updates. Selecting a tag at root switches to a flat filtered view. Ctrl-C to stop.

- [ ] **Step 6: Commit**

```bash
git add src/components/secret-form.tsx src/add-secret.tsx src/manage-secrets.tsx
git commit -m "feat(ui): nested folder navigation and edit/move/retag"
```

---

### Task 9: Export & Import commands

**Files:**
- Create: `src/export-secrets.tsx`
- Create: `src/import-secrets.tsx`

**Interfaces:**
- Consumes: `getStore` (Task 8), `exportPlain`/`exportEncrypted`/`importData` (Task 6), `@raycast/api`.
- Produces: nothing consumed by later tasks.

> `mode: "no-view"` commands can still render a `<Form>`/`<Detail>` when they need input — Raycast shows it. Verified manually.

- [ ] **Step 1: Create the Export command**

Create `src/export-secrets.tsx`:
```tsx
import {
  Action, ActionPanel, Form, confirmAlert, environment, open, showToast, Toast,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getStore } from "./lib/context";
import { exportPlain, exportEncrypted } from "./lib/portable";

export default function ExportSecrets() {
  async function handleSubmit(values: { format: string; passphrase: string }) {
    const store = await getStore().load();
    let contents: string;
    let file: string;

    if (values.format === "encrypted") {
      if (!values.passphrase) {
        await showToast({ style: Toast.Style.Failure, title: "Passphrase required for encrypted export" });
        return;
      }
      contents = exportEncrypted(store, values.passphrase);
      file = join(environment.supportPath, `secrets-export-${Date.now()}.json`);
    } else {
      const ok = await confirmAlert({
        title: "Export as plain text?",
        message: "Secret values will be written UNENCRYPTED to disk.",
      });
      if (!ok) return;
      contents = exportPlain(store);
      file = join(environment.supportPath, `secrets-export-plain-${Date.now()}.json`);
    }

    await writeFile(file, contents, "utf8");
    await showToast({ style: Toast.Style.Success, title: "Exported", message: file });
    await open(environment.supportPath);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Format" defaultValue="encrypted">
        <Form.Dropdown.Item value="encrypted" title="Encrypted (passphrase)" />
        <Form.Dropdown.Item value="plain" title="Plain JSON (unencrypted)" />
      </Form.Dropdown>
      <Form.PasswordField id="passphrase" title="Passphrase" placeholder="required for encrypted export" />
    </Form>
  );
}
```

- [ ] **Step 2: Create the Import command**

Create `src/import-secrets.tsx`:
```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { getStore } from "./lib/context";
import { importData } from "./lib/portable";
import type { Secret } from "./lib/types";

function mergeSecrets(current: Secret[], incoming: Secret[]): Secret[] {
  const key = (s: Secret) => `${s.folder.join("/")} ${s.name}`;
  const seen = new Map(current.map((s) => [key(s), s]));
  for (const s of incoming) seen.set(key(s), s); // overwrite on folder+name conflict
  return [...seen.values()];
}

export default function ImportSecrets() {
  async function handleSubmit(values: { file: string[]; passphrase: string }) {
    const path = values.file?.[0];
    if (!path) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a file" });
      return;
    }
    try {
      const text = await readFile(path, "utf8");
      const imported = importData(text, values.passphrase || undefined);
      const store = getStore();
      const current = await store.load();
      current.secrets = mergeSecrets(current.secrets, imported.secrets);
      const folderKey = (f: string[]) => f.join(" ");
      const folders = new Map(current.folders.map((f) => [folderKey(f), f]));
      for (const f of imported.folders) folders.set(folderKey(f), f);
      current.folders = [...folders.values()];
      await store.save(current);
      await showToast({ style: Toast.Style.Success, title: `Imported ${imported.secrets.length} secrets` });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Import failed", message: String(e) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="File" allowMultipleSelection={false} />
      <Form.PasswordField id="passphrase" title="Passphrase" placeholder="only for encrypted exports" />
    </Form>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Run **Export Secrets** with Encrypted + passphrase → note the file path. Delete a secret in Manage Secrets, then run **Import Secrets**, pick that file, enter the passphrase → the secret returns. Repeat with Plain JSON (confirm the warning appears). Ctrl-C to stop.

- [ ] **Step 5: Commit**

```bash
git add src/export-secrets.tsx src/import-secrets.tsx
git commit -m "feat(ui): export and import commands"
```

---

### Task 10: Daily backup command

**Files:**
- Create: `src/daily-backup.ts`

**Interfaces:**
- Consumes: `runBackup` (Task 5), `backupConfigFrom` (Task 7), `@raycast/api`.
- Produces: nothing.

- [ ] **Step 1: Create the background command**

Create `src/daily-backup.ts`:
```ts
import { join } from "node:path";
import { environment, getPreferenceValues } from "@raycast/api";
import { runBackup } from "./lib/backup";
import { backupConfigFrom } from "./lib/prefs";

export default async function DailyBackup() {
  const prefs = getPreferenceValues<{
    enableBackups?: boolean;
    backupDir?: string;
    retention?: string;
    dailyBackup?: boolean;
  }>();
  if (!prefs.dailyBackup) return;

  const defaultDir = join(environment.supportPath, "backups");
  const cfg = backupConfigFrom(prefs, defaultDir);
  await runBackup(join(environment.supportPath, "secrets.enc"), { ...cfg, enabled: true });
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. In Raycast open the extension's command list; **Daily Backup** appears as a background command. Trigger it once manually (run the command) and confirm a `secrets-<ts>.enc` file lands in the backup folder (`environment.supportPath/backups`, or your configured folder). Ctrl-C to stop.

- [ ] **Step 4: Full test suite + build**

Run: `npm test && npm run build`
Expected: all unit tests pass; `ray build` completes without errors.

- [ ] **Step 5: Commit**

```bash
git add src/daily-backup.ts
git commit -m "feat(backup): daily scheduled background backup command"
```

---

## Self-Review

**Spec coverage:**
- Encrypted local file store → Tasks 2, 4. ✓
- macOS Keychain key → Task 3. ✓
- Add / Get(copy) / Manage / Delete → Tasks 8. ✓
- Export & Import (both encrypted + plain, user picks) → Tasks 6, 9. ✓
- Tags → Tasks 4 (setTags), 8 (filter dropdown). ✓
- Nested folders incl. empty folders → Task 4 (`createFolder`, `folderTree`). ✓
- Backups: on-write + daily, configurable → Tasks 5, 7, 10. ✓
- Performance (whole-blob) → Task 4 design. ✓
- Atomic writes, error handling → Task 4. ✓

**Note on partial UI coverage:** the list hub (Task 8) ships Copy/Add/Delete and tag filtering. Edit, Change tags, Move folder, `createFolder`, and folder-drill-down navigation have store-layer support (Task 4) but are not yet wired into `manage-secrets.tsx`. If the full folder-navigation UI is required for v1, add a follow-up task; otherwise these are fast follow-ons on top of the finished store API. Confirm scope with the user before execution.

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `SecretInput`, `Secret`, `Store`, `Encrypted`, `BackupConfig`, `KeyStore`, and `SecretsStore` method names are consistent across tasks. `afterSave` signature `(filePath: string) => Promise<void>` matches `makeAfterSave` and `SecretsStore` constructor.
