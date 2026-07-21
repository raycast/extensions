import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

  it("does not collide folder paths that share a slash-joined form", async () => {
    await store.createFolder(["a/b"]);
    await store.createFolder(["a", "b"]);
    const tree = await store.folderTree();
    expect(tree).toContainEqual(["a/b"]);
    expect(tree).toContainEqual(["a", "b"]);
    expect(tree).toContainEqual(["a"]);
  });

  it("registers tags in the catalog when a secret is added, sorted and deduped", async () => {
    await store.add({ name: "n", value: "v", folder: [], tags: ["prod", "aws"] });
    await store.add({ name: "n2", value: "v", folder: [], tags: ["aws"] });
    const tags = await store.listTags();
    expect(tags.map((t) => t.name)).toEqual(["aws", "prod"]); // sorted, no duplicate
  });

  it("backfills the catalog for tags already on secrets (migration)", async () => {
    // Simulate a pre-catalog store: secret carries tags but the catalog is empty.
    await store.save({
      version: 1,
      secrets: [{ id: "1", name: "n", value: "v", folder: [], tags: ["legacy"], createdAt: 1, updatedAt: 1 }],
      folders: [],
      tags: [],
    });
    const tags = await store.listTags();
    expect(tags.map((t) => t.name)).toContain("legacy");
  });

  it("runs the afterSave hook once per save", async () => {
    let calls = 0;
    const s = new SecretsStore(join(dir, "s2.enc"), new MemoryKeyStore(), async () => {
      calls++;
    });
    await s.add({ name: "n", value: "v", folder: [], tags: [] });
    expect(calls).toBe(1);
  });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
