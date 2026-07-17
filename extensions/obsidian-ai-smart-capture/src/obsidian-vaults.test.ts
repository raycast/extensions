import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverObsidianVaults } from "./obsidian-vaults";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

describe("discoverObsidianVaults", () => {
  it("loads existing vaults from Obsidian's registry", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "obsidian-registry-"));
    temporaryDirectories.push(root);
    const vault = path.join(root, "My Vault");
    await fs.mkdir(vault);
    const registry = path.join(root, "obsidian.json");
    await fs.writeFile(registry, JSON.stringify({ vaults: { abc: { path: vault } } }));

    await expect(discoverObsidianVaults(registry)).resolves.toEqual([{ name: "My Vault", path: vault }]);
  });

  it("ignores missing vault paths", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "obsidian-registry-"));
    temporaryDirectories.push(root);
    const registry = path.join(root, "obsidian.json");
    await fs.writeFile(registry, JSON.stringify({ vaults: { abc: { path: path.join(root, "missing") } } }));

    await expect(discoverObsidianVaults(registry)).resolves.toEqual([]);
  });
});
