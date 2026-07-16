import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFileUserDataStore } from "../../src/cache/user-data-store";
import { makeUserData } from "../helpers/fixtures";
import { makeTempTree, type TempTree } from "../helpers/tmp";

let tree: TempTree;

beforeEach(() => {
  tree = makeTempTree();
});
afterEach(() => {
  tree.cleanup();
});

function storePath(): string {
  return join(tree.root, "user-data.json");
}

describe("createFileUserDataStore", () => {
  it("returns an empty map when no file exists", async () => {
    const store = createFileUserDataStore(storePath());
    expect((await store.load()).size).toBe(0);
  });

  it("round-trips a user-data map", async () => {
    const store = createFileUserDataStore(storePath());
    const data = new Map([
      ["/a", makeUserData({ favorite: true, openCount: 3 })],
      ["/b", makeUserData({ pinned: true, lastOpenedAt: 999 })],
    ]);
    expect(await store.save(data)).toBe(true);
    const loaded = await store.load();
    expect(loaded.get("/a")?.openCount).toBe(3);
    expect(loaded.get("/b")?.pinned).toBe(true);
  });

  it("ignores malformed entries on load", async () => {
    writeFileSync(
      storePath(),
      JSON.stringify({
        "/valid": makeUserData({ favorite: true }),
        "/invalid": { favorite: "yes" },
        "/alsoInvalid": 5,
      }),
    );
    const store = createFileUserDataStore(storePath());
    const loaded = await store.load();
    expect(loaded.size).toBe(1);
    expect(loaded.get("/valid")?.favorite).toBe(true);
  });

  it("returns an empty map for corrupt JSON", async () => {
    writeFileSync(storePath(), "not json");
    const store = createFileUserDataStore(storePath());
    expect((await store.load()).size).toBe(0);
  });
});
