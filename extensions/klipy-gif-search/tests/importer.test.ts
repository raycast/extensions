import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { environment } from "@raycast/api";
import { discoverGifFolders, importGifFiles } from "../src/importer";

const temporaryFolders: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryFolders
      .splice(0)
      .map((folder) => fs.rm(folder, { recursive: true, force: true })),
  );
  await fs.rm(environment.supportPath, { recursive: true, force: true });
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

  it("reports linked folders that cannot be read", async () => {
    const missing = path.join(os.tmpdir(), "missing-klipy-folder");

    await expect(discoverGifFolders([missing])).rejects.toThrow(
      `Could not read linked GIF folder “${missing}”`,
    );
  });

  it("validates every file before creating library copies", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "klipy-import-"));
    temporaryFolders.push(root);
    const valid = path.join(root, "valid.gif");
    const invalid = path.join(root, "invalid.gif");
    await Promise.all([
      fs.writeFile(valid, "GIF89a"),
      fs.writeFile(invalid, "not-a-gif"),
    ]);

    await expect(importGifFiles([valid, invalid])).rejects.toThrow(
      "invalid.gif does not contain valid GIF data",
    );
    const library = path.join(environment.supportPath, "library");
    expect(await fs.readdir(library)).toEqual([]);
  });

  it("rolls back only copies created by the current import", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "klipy-import-"));
    temporaryFolders.push(root);
    const source = path.join(root, "valid.gif");
    await fs.writeFile(source, "GIF89a");

    const first = await importGifFiles([source]);
    const destination = first.items[0].localPath!;
    const repeated = await importGifFiles([source]);
    await repeated.rollback();
    expect(await fs.readFile(destination, "ascii")).toBe("GIF89a");

    await first.rollback();
    await expect(fs.stat(destination)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
