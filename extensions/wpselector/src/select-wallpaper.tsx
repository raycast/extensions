import { Action, ActionPanel, closeMainWindow, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import fs from "fs";
import path from "path";

const WALLS_DIR = `${process.env.HOME}/Pictures/walls`;

// Start with base folders
const WALLPAPER_DIRS: string[] = [];

// Add all subdirectories in WALLS_DIR
if (fs.existsSync(WALLS_DIR)) {
  const wallSubDirs = fs
    .readdirSync(WALLS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.join(WALLS_DIR, dirent.name));

  WALLPAPER_DIRS.push(...wallSubDirs);
}

const CACHE_FILE = `${process.env.HOME}/.cache/current_wallpaper.txt`;

interface Wallpaper {
  path: string;
}

export default function Command() {
  const favoritesPath = path.join(WALLS_DIR, "favorites");
  const [selectedFolder, setSelectedFolder] = useState(
    fs.existsSync(favoritesPath) ? favoritesPath : WALLPAPER_DIRS[0],
  );
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWallpapers = (folder: string) => {
    try {
      const dir = folder;
      const files = fs
        .readdirSync(dir)
        .filter((file) => file.match(/\.(jpe?g|png|heic)$/i))
        .map((file) => ({
          path: path.join(dir, file),
        }));

      setWallpapers(files);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load wallpapers",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadWallpapers(selectedFolder);
  }, [selectedFolder]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Pick a wallpaper..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Folder" value={selectedFolder} onChange={setSelectedFolder}>
          {WALLPAPER_DIRS.map((dir) => (
            <List.Dropdown.Item key={dir} title={path.basename(dir)} value={dir} />
          ))}
        </List.Dropdown>
      }
    >
      {wallpapers.map((wp) => (
        <List.Item
          key={wp.path}
          title={path.basename(wp.path, path.extname(wp.path)).replace(/[-_]/g, " ")}
          detail={<List.Item.Detail markdown={`![preview](${wp.path})`} />}
          actions={
            <ActionPanel>
              <Action
                title="Use This Wallpaper"
                onAction={async () => {
                  fs.writeFileSync(CACHE_FILE, wp.path);
                  await showToast({ title: "Wallpaper path saved", message: wp.path });
                  await closeMainWindow({ clearRootSearch: true });
                }}
              />
              <Action.CopyToClipboard title="Copy Path" content={wp.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
