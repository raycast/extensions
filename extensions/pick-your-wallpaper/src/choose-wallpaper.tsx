import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { Preferences } from "./types/preferences";
import { applyWallpaperUpdate, isValidFile } from "./utils";
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  environment,
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
    const fileName = path.basename(filePath);
    const sanitizedFileName = sanitizeFileName(fileName);
    const thumbnailPath = path.join(specificThumbDir, `thumb_${sanitizedFileName}`);

    try {
      await stat(thumbnailPath);
      return thumbnailPath;
    } catch {
      await fs.promises.copyFile(filePath, thumbnailPath);
      await execPromise(`sips -Z 300 "${thumbnailPath}"`);
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

  useEffect(() => {
    getWallpapers()
      .then(setWallpapers)
      .catch((error) => console.error("Error loading wallpapers:", error))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredWallpapers = wallpapers.filter((file) => file.name.toLowerCase().includes(searchText.toLowerCase()));

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
      searchBarPlaceholder="Search for wallpapers"
      isLoading={isLoading}
    >
      <Grid.EmptyView icon={Icon.Image} title="No wallpapers found. Add some images." />
      {filteredWallpapers.map((file) => (
        <Grid.Item
          key={file.path}
          title={preferences.showTitle ? file.name.split(".")[0].replace(/[-_]/g, " ") : ""}
          content={{ source: file.thumbnail }}
          actions={
            <ActionPanel>
              <Action title="Set as Wallpaper" icon={Icon.Desktop} onAction={() => applyWallpaperUpdate(file.path)} />
              <Action.ShowInFinder path={file.path} />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={() => openExtensionPreferences()}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
