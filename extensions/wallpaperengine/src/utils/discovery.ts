import { access, readFile, readdir } from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { LocalStorage } from "@raycast/api";
import { WallpaperInfo } from "./types";
import { getPrefs } from "./prefs";

const execFileAsync = promisify(execFile);

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getSteamPath(): Promise<string | null> {
  const regPaths = [
    "HKLM\\SOFTWARE\\Valve\\Steam",
    "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam",
  ];

  for (const regPath of regPaths) {
    try {
      const { stdout } = await execFileAsync(
        "reg",
        ["query", regPath, "/v", "InstallPath"],
        {
          encoding: "utf-8",
        },
      );
      const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
      if (match) {
        return match[1].trim();
      }
    } catch {
      // continue
    }
  }

  return null;
}

export async function getSteamLibraries(steamPath: string): Promise<string[]> {
  const libraries = [steamPath];
  const vdfPath = path.join(steamPath, "steamapps", "libraryfolders.vdf");

  try {
    const content = await readFile(vdfPath, "utf-8");
    const regex = /"path"\s+"([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const libraryPath = match[1].replace(/\\\\/g, "\\");
      if (!libraries.includes(libraryPath)) {
        libraries.push(libraryPath);
      }
    }
  } catch {
    // ignore
  }

  return libraries;
}

export async function findWallpaperEnginePath(): Promise<string | null> {
  const steamPath = await getSteamPath();
  if (!steamPath) {
    return null;
  }

  const libraries = await getSteamLibraries(steamPath);
  for (const library of libraries) {
    const wePath = path.join(
      library,
      "steamapps",
      "common",
      "wallpaper_engine",
    );
    if (
      (await pathExists(path.join(wePath, "wallpaper32.exe"))) ||
      (await pathExists(path.join(wePath, "wallpaper64.exe")))
    ) {
      return wePath;
    }
  }

  return null;
}

export async function getCurrentWallpaperPath(
  monitorIndex: number,
): Promise<string | null> {
  const prefs = getPrefs();
  let wePath = prefs.wallpaperEnginePath;

  if (!wePath) {
    const foundPath = await findWallpaperEnginePath();
    if (foundPath) {
      wePath = foundPath;
    }
  }

  if (!wePath) {
    return null;
  }

  const configPath = path.join(wePath, "config.json");
  try {
    const config = JSON.parse(await readFile(configPath, "utf-8"));

    // Find the user section (first top-level key that is not "?installdirectory")
    const userKeys = Object.keys(config).filter(
      (k) => k !== "?installdirectory",
    );
    if (userKeys.length === 0) {
      return null;
    }

    const userKey = userKeys[0];
    const userConfig = config[userKey];

    if (!userConfig?.general?.wallpaperconfig?.selectedwallpapers) {
      return null;
    }

    const selected = userConfig.general.wallpaperconfig.selectedwallpapers;
    const monitorKey = `Monitor${monitorIndex}`;
    const monitorConfig = selected[monitorKey];

    if (monitorConfig?.file) {
      return monitorConfig.file;
    }

    return null;
  } catch {
    return null;
  }
}

export async function scanWallpapers(): Promise<WallpaperInfo[]> {
  const steamPath = await getSteamPath();
  if (!steamPath) {
    return [];
  }

  const libraries = await getSteamLibraries(steamPath);
  const wallpapers: WallpaperInfo[] = [];

  for (const library of libraries) {
    // Scan Workshop
    const workshopPath = path.join(
      library,
      "steamapps",
      "workshop",
      "content",
      "431960",
    );
    try {
      const workshopIds = await readdir(workshopPath);
      for (const id of workshopIds) {
        const projectPath = path.join(workshopPath, id, "project.json");
        try {
          const project = JSON.parse(await readFile(projectPath, "utf-8"));
          wallpapers.push({
            id,
            title: project.title || `Workshop ${id}`,
            type: project.type || "unknown",
            filePath: projectPath,
            source: "workshop",
          });
        } catch {
          // ignore invalid projects
        }
      }
    } catch {
      // ignore
    }

    // Scan Local Projects
    const localPath = path.join(
      library,
      "steamapps",
      "common",
      "wallpaper_engine",
      "projects",
      "myprojects",
    );
    try {
      const projectDirs = await readdir(localPath);
      for (const dir of projectDirs) {
        const projectPath = path.join(localPath, dir, "project.json");
        try {
          const project = JSON.parse(await readFile(projectPath, "utf-8"));
          wallpapers.push({
            id: dir,
            title: project.title || dir,
            type: project.type || "unknown",
            filePath: projectPath,
            source: "local",
          });
        } catch {
          // ignore invalid projects
        }
      }
    } catch {
      // ignore
    }
  }

  return wallpapers;
}

export async function getCachedWallpapers(): Promise<WallpaperInfo[]> {
  const cached = await LocalStorage.getItem<string>("wallpaper-cache");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
}

export async function setCachedWallpapers(
  wallpapers: WallpaperInfo[],
): Promise<void> {
  await LocalStorage.setItem("wallpaper-cache", JSON.stringify(wallpapers));
  await LocalStorage.setItem(
    "wallpaper-cache-timestamp",
    Date.now().toString(),
  );
}

export async function discoverWallpapers(): Promise<WallpaperInfo[]> {
  const wallpapers = await scanWallpapers();
  await setCachedWallpapers(wallpapers);
  return wallpapers;
}

export async function scanPlaylists(): Promise<string[]> {
  const prefs = getPrefs();
  let wePath = prefs.wallpaperEnginePath;

  if (!wePath) {
    const foundPath = await findWallpaperEnginePath();
    if (foundPath) {
      wePath = foundPath;
    }
  }

  if (!wePath) {
    return [];
  }

  const configPath = path.join(wePath, "config.json");
  try {
    const config = JSON.parse(await readFile(configPath, "utf-8"));

    // Find the user section (first top-level key that is not "?installdirectory")
    const userKeys = Object.keys(config).filter(
      (k) => k !== "?installdirectory",
    );
    if (userKeys.length === 0) {
      return [];
    }

    const userKey = userKeys[0];
    const userConfig = config[userKey];

    const playlists = userConfig?.general?.playlists;
    if (Array.isArray(playlists)) {
      return playlists.map(
        (p: { name?: string; title?: string }) =>
          p.name || p.title || "Unknown",
      );
    }
  } catch {
    // ignore
  }

  return [];
}

export async function scanProfiles(): Promise<string[]> {
  const prefs = getPrefs();
  let wePath = prefs.wallpaperEnginePath;

  if (!wePath) {
    const foundPath = await findWallpaperEnginePath();
    if (foundPath) {
      wePath = foundPath;
    }
  }

  if (!wePath) {
    return [];
  }

  const configPath = path.join(wePath, "config.json");
  try {
    const config = JSON.parse(await readFile(configPath, "utf-8"));

    // Find the user section (first top-level key that is not "?installdirectory")
    const userKeys = Object.keys(config).filter(
      (k) => k !== "?installdirectory",
    );
    if (userKeys.length === 0) {
      return [];
    }

    const userKey = userKeys[0];
    const userConfig = config[userKey];

    const profiles = userConfig?.general?.profiles;
    if (Array.isArray(profiles)) {
      return profiles.map(
        (p: { name?: string; title?: string }) =>
          p.name || p.title || "Unknown",
      );
    }
  } catch {
    // ignore
  }

  return [];
}

export async function getCachedPlaylists(): Promise<string[]> {
  const cached = await LocalStorage.getItem<string>("playlist-cache");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
}

export async function setCachedPlaylists(playlists: string[]): Promise<void> {
  await LocalStorage.setItem("playlist-cache", JSON.stringify(playlists));
  await LocalStorage.setItem("playlist-cache-timestamp", Date.now().toString());
}

export async function discoverPlaylists(): Promise<string[]> {
  const playlists = await scanPlaylists();
  await setCachedPlaylists(playlists);
  return playlists;
}

export async function getCachedProfiles(): Promise<string[]> {
  const cached = await LocalStorage.getItem<string>("profile-cache");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
}

export async function setCachedProfiles(profiles: string[]): Promise<void> {
  await LocalStorage.setItem("profile-cache", JSON.stringify(profiles));
  await LocalStorage.setItem("profile-cache-timestamp", Date.now().toString());
}

export async function discoverProfiles(): Promise<string[]> {
  const profiles = await scanProfiles();
  await setCachedProfiles(profiles);
  return profiles;
}
