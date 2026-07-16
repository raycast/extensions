import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readJsonFile, writeJsonFileAtomic } from "../../src/cache/json-file";
import { makeTempTree, type TempTree } from "../helpers/tmp";

let tree: TempTree;

beforeEach(() => {
  tree = makeTempTree();
});
afterEach(() => {
  tree.cleanup();
});

describe("json-file", () => {
  it("round-trips a value through an atomic write and read", async () => {
    const path = join(tree.root, "nested", "data.json");
    const write = await writeJsonFileAtomic(path, { a: 1, b: ["x"] }, "test");
    expect(write.ok).toBe(true);
    const read = await readJsonFile<{ a: number; b: string[] }>(path);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value).toEqual({ a: 1, b: ["x"] });
    }
  });

  it("creates parent directories as needed", async () => {
    const path = join(tree.root, "deep", "a", "b", "c.json");
    const write = await writeJsonFileAtomic(path, { ok: true }, "test");
    expect(write.ok).toBe(true);
  });

  it("returns an error branch for a missing file", async () => {
    const read = await readJsonFile(join(tree.root, "missing.json"));
    expect(read.ok).toBe(false);
  });

  it("returns an error branch for corrupt JSON", async () => {
    const path = join(tree.root, "corrupt.json");
    writeFileSync(path, "{ this is not json");
    const read = await readJsonFile(path);
    expect(read.ok).toBe(false);
  });

  it("does not leave a temp file behind after a successful write", async () => {
    const path = join(tree.root, "data.json");
    await writeJsonFileAtomic(path, { x: 1 }, "unique-suffix");
    const tempRead = await readJsonFile(join(tree.root, ".unique-suffix.tmp"));
    expect(tempRead.ok).toBe(false);
  });
});
