import {
  Action,
  ActionPanel,
  Grid,
  List,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  useNavigation,
  showHUD,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { useState, useEffect, useMemo } from "react";
import { setWallpaper, scanDirectory, ImageFile } from "./utils";

interface FolderItem {
  name: string;
  path: string;
  imageCount: number;
  isSelected: boolean;
}

// Custom Cycle Configuration Component (pushed from ActionPanel)
function CycleConfig({
  folders,
  picturesDir,
}: {
  folders: string[];
  picturesDir: string;
}) {
  const { pop } = useNavigation();
  const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [cycleMode, setCycleMode] = useState<"sequential" | "random">(
    "sequential",
  );
  const [cycleInterval, setCycleInterval] = useState<number>(1800000); // Default 30 min
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const INTERVAL_OPTIONS = [
    { label: "10 Minutes", value: 600000 },
    { label: "30 Minutes (Default)", value: 1800000 },
    { label: "1 Hour", value: 3600000 },
    { label: "3 Hours", value: 10800000 },
    { label: "6 Hours", value: 21600000 },
    { label: "12 Hours", value: 43200000 },
    { label: "24 Hours", value: 86400000 },
  ];

  useEffect(() => {
    async function loadData() {
      const savedFoldersStr =
        await LocalStorage.getItem<string>("cycle-folders");
      const savedMode =
        (await LocalStorage.getItem<string>("cycle-mode")) || "sequential";
      const savedInterval = await LocalStorage.getItem<number>(
        "cycle-custom-interval",
      );
      const savedFavoritesOnly = await LocalStorage.getItem<boolean>(
        "cycle-favorites-only",
      );
      const savedFolders: string[] = savedFoldersStr
        ? JSON.parse(savedFoldersStr)
        : [];

      setSelectedFolders(savedFolders);
      setCycleMode(savedMode as "sequential" | "random");
      if (savedInterval) setCycleInterval(savedInterval);
      if (savedFavoritesOnly !== undefined)
        setFavoritesOnly(savedFavoritesOnly);

      // Build folder items with image counts
      const items: FolderItem[] = [];

      // Add root folder
      try {
        const rootEntries = await fs.promises.readdir(picturesDir, {
          withFileTypes: true,
        });
        const rootImages = rootEntries.filter((e) => {
          if (!e.isFile()) return false;
          const ext = path.extname(e.name).toLowerCase();
          return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
        });
        if (rootImages.length > 0) {
          items.push({
            name: "Pictures (Root)",
            path: "__root__",
            imageCount: rootImages.length,
            isSelected: savedFolders.includes("__root__"),
          });
        }
      } catch (error) {
        console.error("Error scanning root:", error);
      }

      // Add subfolders
      for (const folder of folders) {
        const folderPath = path.join(picturesDir, folder);
        try {
          const entries = await fs.promises.readdir(folderPath, {
            withFileTypes: true,
          });
          const imageCount = entries.filter((e) => {
            if (!e.isFile()) return false;
            const ext = path.extname(e.name).toLowerCase();
            return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
          }).length;

          if (imageCount > 0) {
            items.push({
              name: folder.split("/").pop() || folder,
              path: folder,
              imageCount,
              isSelected: savedFolders.includes(folder),
            });
          }
        } catch (error) {
          console.error(`Error scanning ${folder}:`, error);
        }
      }

      setFolderItems(items);
      setIsLoading(false);
    }

    loadData();
  }, [folders, picturesDir]);

  const toggleFolder = async (folderPath: string) => {
    let newSelected: string[];
    if (selectedFolders.includes(folderPath)) {
      newSelected = selectedFolders.filter((f) => f !== folderPath);
    } else {
      newSelected = [...selectedFolders, folderPath];
    }

    setSelectedFolders(newSelected);
    await LocalStorage.setItem("cycle-folders", JSON.stringify(newSelected));

    setFolderItems((prev) =>
      prev.map((f) => ({
        ...f,
        isSelected: newSelected.includes(f.path),
      })),
    );

    await showToast({
      style: Toast.Style.Success,
      title: newSelected.includes(folderPath)
        ? "Added to cycle"
        : "Removed from cycle",
    });
  };

  const toggleMode = async () => {
    const newMode = cycleMode === "sequential" ? "random" : "sequential";
    setCycleMode(newMode);
    await LocalStorage.setItem("cycle-mode", newMode);
    await showToast({
      style: Toast.Style.Success,
      title: `Mode: ${newMode}`,
    });
  };

  const toggleFavoritesOnly = async () => {
    const newState = !favoritesOnly;
    setFavoritesOnly(newState);
    await LocalStorage.setItem("cycle-favorites-only", newState);
    await showToast({
      style: Toast.Style.Success,
      title: newState ? "Cycle Favorites Only" : "Cycle All Sources",
    });
  };

  const changeInterval = async (interval: number) => {
    setCycleInterval(interval);
    await LocalStorage.setItem("cycle-custom-interval", interval);
    await showToast({ style: Toast.Style.Success, title: "Interval Updated" });
  };

  return (
    <List isLoading={isLoading} navigationTitle="Configure Wallpaper Cycle">
      <List.Section title="Cycle Settings">
        <List.Item
          icon={Icon.Clock}
          title="Interval"
          subtitle={
            INTERVAL_OPTIONS.find((i) => i.value === cycleInterval)?.label
          }
          actions={
            <ActionPanel>
              {INTERVAL_OPTIONS.map((opt) => (
                <Action
                  key={opt.value}
                  title={`Set to ${opt.label}`}
                  onAction={() => changeInterval(opt.value)}
                />
              ))}
            </ActionPanel>
          }
        />
        <List.Item
          icon={cycleMode === "sequential" ? Icon.ArrowRight : Icon.Shuffle}
          title={cycleMode === "sequential" ? "Sequential" : "Random"}
          subtitle="Cycle Order"
          actions={
            <ActionPanel>
              <Action title="Toggle Mode" onAction={toggleMode} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={favoritesOnly ? Icon.Star : Icon.StarDisabled}
          title="Favorites Only"
          subtitle={favoritesOnly ? "Yes" : "No"}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Favorites Only"
                onAction={toggleFavoritesOnly}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title={`Folders (${selectedFolders.length} selected)`}
        subtitle={favoritesOnly ? "Ignored when 'Favorites Only' is on" : ""}
      >
        {folderItems.map((folder) => (
          <List.Item
            key={folder.path}
            icon={folder.isSelected ? Icon.CheckCircle : Icon.Circle}
            title={folder.name}
            subtitle={`${folder.imageCount} images`}
            accessories={[{ text: folder.isSelected ? "✓ In Cycle" : "" }]}
            actions={
              <ActionPanel>
                <Action
                  title={
                    folder.isSelected ? "Remove from Cycle" : "Add to Cycle"
                  }
                  onAction={() => toggleFolder(folder.path)}
                />
                <Action title="Toggle Mode" onAction={toggleMode} />
                <Action title="Go Back" onAction={pop} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("__all__");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const picturesDir = path.join(os.homedir(), "Pictures");

  useEffect(() => {
    async function loadFiles(forceRefresh = false) {
      setIsLoading(true);
      try {
        if (forceRefresh) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Refreshing library...",
          });
        }

        if (!fs.existsSync(picturesDir)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Pictures directory not found",
          });
          setIsLoading(false);
          return;
        }

        // Load favorites
        const savedFavorites = await LocalStorage.getItem<string>("favorites");
        const favoritePaths = savedFavorites
          ? new Set<string>(JSON.parse(savedFavorites))
          : new Set<string>();
        setFavorites(favoritePaths);

        // Try to load from cache first
        if (!forceRefresh) {
          const cachedFilesStr =
            await LocalStorage.getItem<string>("cached-files");
          if (cachedFilesStr) {
            const cachedFiles = JSON.parse(cachedFilesStr) as ImageFile[];
            // Reconstruct folders set from cache
            const uniqueFolders = new Set(
              cachedFiles.map((f) => f.folder).filter((f) => f !== "__root__"),
            );

            setFiles(cachedFiles);
            setFolders(Array.from(uniqueFolders).sort());
            setIsLoading(false);
            return;
          }
        }

        const result = await scanDirectory(picturesDir);
        const sortedFolders = Array.from(result.folders).sort();

        setFiles(result.files);
        setFolders(sortedFolders);

        // Save to cache
        await LocalStorage.setItem(
          "cached-files",
          JSON.stringify(result.files),
        );

        setIsLoading(false);

        if (result.files.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No images found",
            message: `Checked: ${picturesDir}`,
          });
        } else if (forceRefresh) {
          await showToast({
            style: Toast.Style.Success,
            title: "Library Refreshed",
            message: `${result.files.length} images found`,
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load images",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setIsLoading(false);
      }
    }

    loadFiles();
  }, [picturesDir]);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState<string>("");

  const toggleFavorite = async (filePath: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(filePath)) {
      newFavorites.delete(filePath);
      await showToast({ title: "Removed from Favorites" });
    } else {
      newFavorites.add(filePath);
      await showToast({ title: "Added to Favorites" });
    }
    setFavorites(newFavorites);
    await LocalStorage.setItem(
      "favorites",
      JSON.stringify(Array.from(newFavorites)),
    );
  };

  // Create a function to expose refresh to actions
  const refreshLibrary = async () => {
    setIsLoading(true);
    try {
      const result = await scanDirectory(picturesDir);
      const sortedFolders = Array.from(result.folders).sort();

      setFiles(result.files);
      setFolders(sortedFolders);

      await LocalStorage.setItem("cached-files", JSON.stringify(result.files));

      setIsLoading(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Library Refreshed",
        message: `${result.files.length} images found`,
      });
    } catch (e) {
      setIsLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    let result = files;

    // Filter by Folder/Category
    if (selectedFolder === "__favorites__") {
      result = files.filter((f) => favorites.has(f.fullPath));
    } else if (selectedFolder === "__all__") {
      result = files;
    } else if (selectedFolder === "__root__") {
      result = files.filter((f) => f.folder === "__root__");
    } else {
      result = files.filter(
        (f) =>
          f.folder === selectedFolder ||
          f.folder.startsWith(selectedFolder + "/"),
      );
    }

    // Filter by Search Text
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lowerSearch));
    }

    return result;
  }, [files, selectedFolder, favorites, searchText]);

  return (
    <Grid
      columns={3}
      aspectRatio="16/9"
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Folder"
          storeValue={true}
          onChange={setSelectedFolder}
        >
          <Grid.Dropdown.Item value="__all__" title="All Folders" />
          <Grid.Dropdown.Item
            value="__favorites__"
            title="Favorites"
            icon={Icon.Star}
          />
          <Grid.Dropdown.Item value="__root__" title="Pictures (Root)" />
          <Grid.Dropdown.Section title="Subfolders">
            {folders.map((folder) => (
              <Grid.Dropdown.Item
                key={folder}
                value={folder}
                title={folder.split("/").pop() || folder}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      onSearchTextChange={setSearchText}
    >
      {filteredFiles.map((file) => (
        <Grid.Item
          key={file.fullPath}
          content={file.fullPath}
          title={file.name}
          subtitle={file.folder === "__root__" ? "" : file.folder}
          accessories={
            favorites.has(file.fullPath)
              ? [{ icon: Icon.Star, tooltip: "Favorite" }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Set Wallpaper"
                onAction={() => setWallpaper(file.fullPath)}
              />
              <Action
                title={favorites.has(file.fullPath) ? "Unfavorite" : "Favorite"}
                icon={
                  favorites.has(file.fullPath) ? Icon.StarDisabled : Icon.Star
                }
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => toggleFavorite(file.fullPath)}
              />
              <Action.Push
                title="Configure Cycle"
                icon={Icon.Clock}
                target={
                  <CycleConfig folders={folders} picturesDir={picturesDir} />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
              <Action.Open title="Open Image" target={file.fullPath} />
              <Action.ShowInFinder path={file.fullPath} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={file.fullPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Refresh Library"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refreshLibrary}
              />
              <Action
                title="Random Wallpaper"
                icon={Icon.Shuffle}
                shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                onAction={async () => {
                  // Pick random file
                  const sourceFiles =
                    filteredFiles.length > 0 ? filteredFiles : files;
                  if (sourceFiles.length === 0) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "No images found",
                    });
                    return;
                  }

                  // Use HUD to mimic the standalone command feel (closes window)
                  await showHUD("🎲 Picking random wallpaper...");

                  const randomFile =
                    sourceFiles[Math.floor(Math.random() * sourceFiles.length)];
                  await setWallpaper(randomFile.fullPath, { silent: true });

                  await showHUD(`✅ Wallpaper: ${randomFile.name}`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
