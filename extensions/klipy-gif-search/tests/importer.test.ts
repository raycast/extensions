import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverGifFolders } from "../src/importer";

const temporaryFolders: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryFolders
      .splice(0)
      .map((folder) => fs.rm(folder, { recursive: true, force: true })),
  );
});

describe("discoverGifFolders", () => {
  it("recursively discovers new GIFs without importing other files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "klipy-gifs-"));
    temporaryFolders.push(root);
    const nested = path.join(root, "nested");
    await fs.mkdir(nested);
    await Promise.all([
      fs.writeFile(path.join(root, "first.gif"), "GIF89a"),
      fs.writeFile(path.join(nested, "second.GIF"), "GIF89a"),
      fs.writeFile(path.join(root, "ignore.png"), "PNG"),
    ]);

    const initial = await discoverGifFolders([root]);
    expect(initial.map((item) => item.title)).toEqual(["first", "second"]);
    expect(initial.every((item) => item.watchedFolder === root)).toBe(true);
    expect(initial.every((item) => item.originalSize === 6)).toBe(true);

    await fs.writeFile(path.join(root, "third.gif"), "GIF89a");
    const refreshed = await discoverGifFolders([root]);
    expect(refreshed.map((item) => item.title)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});
