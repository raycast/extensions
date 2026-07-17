import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ObsidianVault } from "./types";

interface ObsidianRegistry {
  vaults?: Record<string, { path?: string }>;
}

export function getObsidianRegistryPath(): string {
  return path.join(os.homedir(), "Library", "Application Support", "obsidian", "obsidian.json");
}

export async function discoverObsidianVaults(registryPath = getObsidianRegistryPath()): Promise<ObsidianVault[]> {
  try {
    const registry = JSON.parse(await fs.readFile(registryPath, "utf8")) as ObsidianRegistry;
    const discovered = await Promise.all(
      Object.values(registry.vaults ?? {}).map(async ({ path: vaultPath }) => {
        if (!vaultPath) return undefined;
        const resolvedPath = path.resolve(vaultPath);
        try {
          const stat = await fs.stat(resolvedPath);
          if (!stat.isDirectory()) return undefined;
          return { name: path.basename(resolvedPath), path: resolvedPath };
        } catch {
          return undefined;
        }
      })
    );

    return [
      ...new Map(
        discovered.filter((vault): vault is ObsidianVault => Boolean(vault)).map((vault) => [vault.path, vault])
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
