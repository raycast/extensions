import { Action, ActionPanel, Grid, showToast, Toast, getPreferenceValues, LocalStorage, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

interface SearchResult {
  name: string;
  path: string;
  size: string;
  modifiedTimestamp: number;
}

interface Preferences {
  defaultDirectories?: string;
}

const STORAGE_KEY = "image-search-directories";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".svg", ".ico", ".heic"];

export default function SearchImage() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [directories, setDirectories] = useState<string[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadDirectories();
  }, []);

  useEffect(() => {
    if (searchText.trim().length > 0) {
      searchImages();
    } else {
      setResults([]);
    }
  }, [searchText, directories]);

  const loadDirectories = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      let dirs: string[] = [];

      if (stored) {
        dirs = JSON.parse(stored);
      }

      // Add default directories from preferences if any
      if (preferences.defaultDirectories) {
        const defaultDirs = preferences.defaultDirectories.split(",").map((d) => d.trim());
        dirs = [...new Set([...dirs, ...defaultDirs])];
      }

      // If no directories are configured, add common image directories
      if (dirs.length === 0) {
        const homeDir = process.env.HOME || "";
        const commonDirs = [
          path.join(homeDir, "Pictures"),
          path.join(homeDir, "Desktop"),
          path.join(homeDir, "Downloads"),
        ];

        // Only add directories that exist
        for (const dir of commonDirs) {
          if (fs.existsSync(dir)) {
            dirs.push(dir);
          }
        }
      }

      setDirectories(dirs);
    } catch (error) {
      console.error("Failed to load directories:", error);
      showToast(Toast.Style.Failure, "Failed to load search directories");
    }
  };

  const searchImages = async () => {
    if (directories.length === 0) {
      showToast(Toast.Style.Failure, "No search directories configured", "Please add directories first");
      return;
    }

    setIsLoading(true);
    try {
      const searchPromises = directories.map(async (dir) => {
        // Escape directory path for shell
        const escapedDir = dir.replace(/'/g, "'\"'\"'");

        // Create recursive find command to search for image files in all subdirectories
        const extensionPattern = IMAGE_EXTENSIONS.map((ext) => `-name "*${ext}" -o -name "*${ext.toUpperCase()}"`).join(
          " -o ",
        );

        const escapedSearchText = searchText.replace(/'/g, "'\"'\"'");
        const command = `find '${escapedDir}' -type f \\( ${extensionPattern} \\) -iname "*${escapedSearchText}*" 2>/dev/null | head -100`;

        try {
          const { stdout } = await execAsync(command);
          return stdout
            .trim()
            .split("\n")
            .filter((line) => line.length > 0);
        } catch (error) {
          console.error(`Error searching in ${dir}:`, error);
          return [];
        }
      });

      const allResults = await Promise.all(searchPromises);
      const flatResults = allResults.flat();

      // Get file stats for each result
      const resultsWithStats = await Promise.all(
        flatResults.map(async (filePath) => {
          try {
            const stats = await fs.promises.stat(filePath);
            const name = path.basename(filePath);
            const size = formatFileSize(stats.size);
            const modifiedTimestamp = stats.mtime.getTime();

            return {
              name,
              path: filePath,
              size,
              modifiedTimestamp,
            };
          } catch {
            return null;
          }
        }),
      );

      const validResults = resultsWithStats.filter((result): result is SearchResult => result !== null);

      // Sort by modification date (newest first)
      validResults.sort((a, b) => b.modifiedTimestamp - a.modifiedTimestamp);

      setResults(validResults);
    } catch (error) {
      console.error("Search failed:", error);
      showToast(Toast.Style.Failure, "Search failed", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const openInFinder = async (filePath: string) => {
    const escapedPath = filePath.replace(/'/g, "'\"'\"'");
    try {
      await execAsync(`open -R "${escapedPath}"`);
      showToast(Toast.Style.Success, "Opened in Finder");
    } catch {
      showToast(Toast.Style.Failure, "Failed to open in Finder");
    }
  };

  const openWithDefaultApp = (filePath: string) => {
    const escapedPath = filePath.replace(/'/g, "'\"'\"'");
    exec(`open "${escapedPath}"`);
  };

  const openWithApp = async (filePath: string, appName: string) => {
    const escapedPath = filePath.replace(/'/g, "'\"'\"'");
    try {
      await exec(`open -a "${appName}" "${escapedPath}"`);
      showToast(Toast.Style.Success, `Opened with ${appName}`);
    } catch {
      showToast(Toast.Style.Failure, `Failed to open with ${appName}`);
    }
  };

  const copyPath = async (filePath: string) => {
    const escapedPath = filePath.replace(/'/g, "'\"'\"'");
    try {
      await exec(`echo "${escapedPath}" | pbcopy`);
      showToast(Toast.Style.Success, "Path copied to clipboard");
    } catch {
      showToast(Toast.Style.Failure, "Failed to copy path");
    }
  };

  const refreshDirectories = async () => {
    await loadDirectories();
    showToast(Toast.Style.Success, "Directories refreshed");
  };

  const openAddDirectory = async () => {
    await open("raycast://extensions/ahmad_awdiyanto/finder-image-search/manage-directory");
    // Refresh directories after a delay to account for the user adding directories
    setTimeout(() => {
      loadDirectories();
    }, 1000);
  };

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for images by filename..."
      throttle
      columns={5}
      aspectRatio="1"
      actions={
        <ActionPanel>
          <Action title="Manage Directory" onAction={openAddDirectory} />
          <Action title="Refresh Directories" onAction={refreshDirectories} />
        </ActionPanel>
      }
    >
      {results.length === 0 && searchText.trim().length > 0 && !isLoading && (
        <Grid.EmptyView title="No images found" description="Try different search terms or add more directories" />
      )}

      {results.length === 0 && searchText.trim().length === 0 && (
        <Grid.EmptyView
          title="Start typing to search for images"
          description={`Searching in ${directories.length} director${directories.length === 1 ? "y" : "ies"}`}
        />
      )}

      {results.map((result, index) => (
        <Grid.Item
          key={`${result.path}-${index}`}
          content={{ source: result.path }}
          title={result.name}
          subtitle={`${result.size} • ${new Date(result.modifiedTimestamp).toLocaleString()}`}
          quickLook={{ path: result.path, name: result.name }}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => openWithDefaultApp(result.path)} />
              <Action title="Show in Finder" onAction={() => openInFinder(result.path)} />
              <ActionPanel.Section title="Open With">
                <Action title="Open with Photoshop" onAction={() => openWithApp(result.path, "Adobe Photoshop 2024")} />
                <Action title="Open with Figma" onAction={() => openWithApp(result.path, "Figma")} />
                <Action title="Open with Sketch" onAction={() => openWithApp(result.path, "Sketch")} />
                <Action title="Open with Gimp" onAction={() => openWithApp(result.path, "GIMP-2.10")} />
                <Action title="Open with Pixelmator Pro" onAction={() => openWithApp(result.path, "Pixelmator Pro")} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action title="Copy Path" onAction={() => copyPath(result.path)} />
                <Action.CopyToClipboard
                  title="Copy File"
                  content={{ file: result.path }}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action title="Add Directory" onAction={openAddDirectory} />
                <Action title="Refresh Directories" onAction={refreshDirectories} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
