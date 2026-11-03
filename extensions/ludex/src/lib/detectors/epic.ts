import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { InstalledGame } from "../types";

interface EpicManifestItem {
  DisplayName?: string;
  AppName?: string;
  CatalogItemId?: string;
  InstallLocation?: string;
  LaunchExecutable?: string;
  bIsIncompleteInstall?: boolean;
}

function getManifestsDir(): string | null {
  if (process.platform === "win32") {
    const base = process.env.PROGRAMDATA ?? "C:\\ProgramData";
    return path.join(base, "Epic", "EpicGamesLauncher", "Data", "Manifests");
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Epic",
      "EpicGamesLauncher",
      "Data",
      "Manifests",
    );
  }
  // Linux via Heroic launcher
  return path.join(
    os.homedir(),
    ".config",
    "heroic",
    "legendaryConfig",
    "legendary",
    "metadata",
  );
}

export async function detectEpicGames(): Promise<InstalledGame[]> {
  const manifestsDir = getManifestsDir();
  if (!manifestsDir || !fs.existsSync(manifestsDir)) return [];

  const games: InstalledGame[] = [];
  try {
    const entries = fs.readdirSync(manifestsDir);
    for (const entry of entries) {
      if (!entry.endsWith(".item")) continue;
      try {
        const manifest: EpicManifestItem = JSON.parse(
          fs.readFileSync(path.join(manifestsDir, entry), "utf-8"),
        );
        if (manifest.bIsIncompleteInstall) continue;
        if (!manifest.DisplayName || !manifest.InstallLocation) continue;
        const exe = manifest.LaunchExecutable
          ? path.join(manifest.InstallLocation, manifest.LaunchExecutable)
          : undefined;
        games.push({
          name: manifest.DisplayName,
          store: "epic",
          storeGameId: manifest.CatalogItemId ?? manifest.AppName,
          installPath: manifest.InstallLocation,
          launchTarget: manifest.AppName
            ? `com.epicgames.launcher://apps/${manifest.AppName}?action=launch&silent=true`
            : undefined,
          iconPath: exe && fs.existsSync(exe) ? exe : undefined,
        });
      } catch {
        /* skip malformed manifest */
      }
    }
  } catch {
    /* ignore */
  }

  return games;
}
