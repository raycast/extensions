import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFileIndexStore } from "../../src/cache/index-store";
import { INDEX_SCHEMA_VERSION, type RepositoryIndex } from "../../src/types/index-state";
import { makeRecord } from "../helpers/fixtures";
import { makeTempTree, type TempTree } from "../helpers/tmp";

let tree: TempTree;

beforeEach(() => {
  tree = makeTempTree();
});
afterEach(() => {
  tree.cleanup();
});

function indexPath(): string {
  return join(tree.root, "index.json");
}

const sampleIndex: RepositoryIndex = {
  version: INDEX_SCHEMA_VERSION,
  updatedAt: 123,
  records: [makeRecord({ path: "/a", name: "a" }), makeRecord({ path: "/b", name: "b" })],
};

describe("createFileIndexStore", () => {
  it("returns null when no index file exists", async () => {
    const store = createFileIndexStore(indexPath());
    expect(await store.load()).toBeNull();
  });

  it("round-trips an index", async () => {
    const store = createFileIndexStore(indexPath());
    expect(await store.save(sampleIndex)).toBe(true);
    const loaded = await store.load();
    expect(loaded?.records).toHaveLength(2);
    expect(loaded?.updatedAt).toBe(123);
  });

  it("discards an index with a mismatched schema version", async () => {
    writeFileSync(indexPath(), JSON.stringify({ version: 999, updatedAt: 1, records: [] }));
    const store = createFileIndexStore(indexPath());
    expect(await store.load()).toBeNull();
  });

  it("filters out malformed records but keeps valid ones", async () => {
    writeFileSync(
      indexPath(),
      JSON.stringify({
        version: INDEX_SCHEMA_VERSION,
        updatedAt: 5,
        records: [makeRecord({ path: "/good", name: "good" }), { path: 42 }, null, "nope"],
      }),
    );
    const store = createFileIndexStore(indexPath());
    const loaded = await store.load();
    expect(loaded?.records).toHaveLength(1);
    expect(loaded?.records[0]?.name).toBe("good");
  });

  it("returns null for a structurally invalid payload", async () => {
    writeFileSync(indexPath(), JSON.stringify({ version: INDEX_SCHEMA_VERSION }));
    const store = createFileIndexStore(indexPath());
    expect(await store.load()).toBeNull();
  });
});
