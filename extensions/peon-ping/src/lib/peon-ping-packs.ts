import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type InstalledPack = {
  name: string;
  displayName: string;
};

type PackManifest = {
  name?: string;
  display_name?: string;
};

export function getInstalledPacks(packsDir: string): InstalledPack[] {
  if (!existsSync(packsDir)) return [];

  const entries = readdirSync(packsDir);
  const packs: InstalledPack[] = [];

  for (const entry of entries) {
    const packDir = join(packsDir, entry);
    if (!statSync(packDir).isDirectory()) continue;

    const manifestPath = existsSync(join(packDir, "openpeon.json"))
      ? join(packDir, "openpeon.json")
      : existsSync(join(packDir, "manifest.json"))
        ? join(packDir, "manifest.json")
        : null;

    if (!manifestPath) continue;

    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as PackManifest;
    packs.push({
      name: entry,
      displayName: manifest.display_name ?? entry,
    });
  }

  return packs.sort((a, b) => a.name.localeCompare(b.name));
}
