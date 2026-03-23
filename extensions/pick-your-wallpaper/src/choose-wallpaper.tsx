import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { Preferences } from "./types/preferences";
import { applyWallpaperUpdate, isValidFile } from "./utils";
import { DescriptionCache, getDescriptions } from "./ai-descriptions";
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  environment,
  open,
} from "@raycast/api";
import { File } from "./types/file";
import { promisify } from "util";
import { exec } from "child_process";
import crypto from "crypto";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const execPromise = promisify(exec);
const mkdir = promisify(fs.mkdir);

const preferences = getPreferenceValues<Preferences>();
const wallpaperDir = preferences.wallpaperFolder;
const thumbnailDir = path.join(environment.supportPath, "thumbs");

interface FileWithThumbnail extends File {
  thumbnail: string;
}

function createPathHash(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").slice(0, 8);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
}

async function ensureThumbnailDir(dirHash: string) {
  const specificThumbDir = path.join(thumbnailDir, dirHash);
  try {
    await mkdir(thumbnailDir, { recursive: true });
    await mkdir(specificThumbDir, { recursive: true });
    await execPromise(`chmod 755 "${thumbnailDir}" "${specificThumbDir}"`);
  } catch (error) {
    console.error("Error creating thumbnail directories:", error);
  }
  return specificThumbDir;
}

async function createThumbnail(filePath: string, specificThumbDir: string): Promise<string> {
  try {
    // Always use .jpg extension — sips outputs JPEG format
    const baseName = path.basename(filePath, path.extname(filePath));
    const sanitizedBase = sanitizeFileName(baseName);
    const thumbnailPath = path.join(specificThumbDir, `thumb_${sanitizedBase}.jpg`);

    try {
      await stat(thumbnailPath);
      return thumbnailPath;
    } catch {
      // sips child process can't write to Application Support or /tmp (sandbox restriction).
      // Write to TMPDIR (user-scoped temp dir) first, then copy via Node.js.
      const tmpDir = process.env.TMPDIR ?? "/var/folders";
      const tmpPath = path.join(tmpDir, `raycast-thumb-${sanitizedBase}-${Date.now()}.jpg`);
      await execPromise(`sips -Z 300 -s format jpeg --out "${tmpPath}" "${filePath}"`);
      await fs.promises.copyFile(tmpPath, thumbnailPath);
      fs.promises.unlink(tmpPath).catch(() => undefined);
      return thumbnailPath;
    }
  } catch (error) {
    console.error(`Error creating thumbnail for ${filePath}:`, error);
    return filePath;
  }
}

async function getWallpapers(directoryPath: string = wallpaperDir): Promise<FileWithThumbnail[]> {
  let result: FileWithThumbnail[] = [];
  const dirHash = createPathHash(wallpaperDir);
  const specificThumbDir = await ensureThumbnailDir(dirHash);

  try {
    const files = await readdir(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const fileStats = await stat(filePath);

      if (fileStats.isDirectory()) {
        const subDirFiles = await getWallpapers(filePath);
        result = result.concat(subDirFiles);
      } else {
        const newFile = { name: file, path: filePath };
        if (isValidFile(newFile)) {
          const thumbnail = await createThumbnail(filePath, specificThumbDir);
          result.push({ ...newFile, thumbnail });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
  }

  return result;
}

export default function Command() {
  const [wallpapers, setWallpapers] = useState<FileWithThumbnail[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [descriptions, setDescriptions] = useState<DescriptionCache>({});

  useEffect(() => {
    getWallpapers()
      .then(setWallpapers)
      .catch((error) => console.error("Error loading wallpapers:", error))
      .finally(() => setIsLoading(false));
  }, []);

  // Load AI descriptions in background — used for subtitle tags and unified search
  useEffect(() => {
    if (wallpapers.length > 0) {
      getDescriptions(wallpapers)
        .then(setDescriptions)
        .catch((error) => console.error("Error loading AI descriptions:", error));
    }
  }, [wallpapers]);

  // Unified search: score by keyword overlap across filename + description + tags
  const displayedWallpapers = (() => {
    if (!searchText.trim()) return wallpapers;
    const queryWords = searchText.toLowerCase().split(/\s+/).filter(Boolean);
    return wallpapers
      .map((file) => {
        const desc = descriptions[file.path];
        const baseName = path.basename(file.name, path.extname(file.name)).replace(/[-_]/g, " ");
        const haystack = [baseName, desc?.description, desc?.tags].filter(Boolean).join(" ").toLowerCase();
        const score = queryWords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
        return { file, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ file }) => file);
  })();

  const columnCount = {
    small: 7,
    medium: 5,
    large: 3,
  }[preferences.displaySize];

  return (
    <Grid
      columns={columnCount}
      fit={Grid.Fit.Fill}
      aspectRatio="16/9"
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, color, mood, or style…"
      isLoading={isLoading}
    >
      <Grid.EmptyView
        icon={Icon.Image}
        title={searchText.trim() ? "No matches found" : "No wallpapers found. Add some images."}
      />
      {displayedWallpapers.map((file) => {
        const desc = descriptions[file.path];
        return (
          <Grid.Item
            key={file.path}
            title={preferences.showTitle ? file.name.split(".")[0].replace(/[-_]/g, " ") : ""}
            subtitle={desc?.tags || undefined}
            content={{ source: file.thumbnail }}
            actions={
              <ActionPanel>
                <Action title="Set as Wallpaper" icon={Icon.Desktop} onAction={() => applyWallpaperUpdate(file.path)} />
                <Action.ShowInFinder path={file.path} />
                <Action title="Open Wallpaper Folder" icon={Icon.Folder} onAction={() => open(wallpaperDir)} />
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={() => openExtensionPreferences()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
