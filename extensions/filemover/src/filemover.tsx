import {
  ActionPanel,
  List,
  Action,
  Icon,
  getSelectedFinderItems,
  LocalStorage,
  showToast,
  Toast,
  popToRoot,
  closeMainWindow,
  Form,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { performUndo, addHistory } from "./undo-utils";

export interface RenameOptions {
  mode: "replace" | "prefix" | "suffix" | "find_replace";
  text: string;
  findText: string;
  numberFormat: "brackets" | "dash" | "underscore" | "padded";
  appendDate: "none" | "iso" | "eu" | "us" | "unix";
}

function formatIndex(index: number, format: string): string {
  if (index === 0) return "";
  switch (format) {
    case "dash":
      return `-${index}`;
    case "underscore":
      return `_${index}`;
    case "padded":
      return index < 10 ? `_0${index}` : `_${index}`;
    case "brackets":
    default:
      return ` (${index})`;
  }
}

const execFileAsync = promisify(execFile);
const isWin = os.platform() === "win32";
const fileManagerName = isWin ? "Explorer" : "Finder";
const cmdModifier = (isWin ? "ctrl" : "cmd") as "ctrl" | "cmd";

const DEFAULT_FOLDERS = [
  {
    name: "Desktop",
    path: path.join(os.homedir(), "Desktop"),
    icon: Icon.Desktop,
  },
  {
    name: "Documents",
    path: path.join(os.homedir(), "Documents"),
    icon: Icon.Document,
  },
  {
    name: "Downloads",
    path: path.join(os.homedir(), "Downloads"),
    icon: Icon.Download,
  },
];

export default function Command() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<{ name: string; path: string }[]>([]);
  const [recents, setRecents] = useState<{ name: string; path: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<{ name: string; path: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  useEffect(() => {
    async function fetchSelectedFiles() {
      try {
        if (os.platform() === "win32") {
          const psScript = `
$shell = New-Object -ComObject Shell.Application
$selected = @()
foreach ($window in $shell.Windows()) {
    if ($window.FullName -like "*explorer.exe") {
        $items = $window.Document.SelectedItems()
        if ($items -and $items.Count -gt 0) {
            foreach ($item in $items) {
                $selected += $item.Path
            }
        }
    }
}
$selected | Select-Object -Unique
`;
          const { stdout } = await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-NonInteractive", "-Command", psScript],
            { timeout: 2000 },
          );
          const paths = stdout
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean);
          setSelectedFiles((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(paths)) return paths;
            return prev;
          });
        } else {
          const items = await getSelectedFinderItems();
          const paths = items.map((item) => item.path);
          setSelectedFiles((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(paths)) return paths;
            return prev;
          });
        }
      } catch {
        setSelectedFiles((prev) => (prev.length > 0 ? [] : prev));
      }
    }

    async function init() {
      await fetchSelectedFiles();

      const storedFavorites = await LocalStorage.getItem<string>("favorites");
      if (storedFavorites) {
        try {
          setFavorites(JSON.parse(storedFavorites));
        } catch {
          await LocalStorage.removeItem("favorites");
        }
      }

      const storedRecents = await LocalStorage.getItem<string>("recents");
      if (storedRecents) {
        try {
          const parsedRecents = JSON.parse(storedRecents);
          setRecents(parsedRecents.slice(0, 4));
        } catch {
          await LocalStorage.removeItem("recents");
        }
      }

      setIsLoading(false);
    }
    init();

    const syncInterval = setInterval(fetchSelectedFiles, 1000);
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    if (searchText.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const safeQuery = searchText.replace(/["']/g, "");
        if (!safeQuery) {
          setSearchResults([]);
          setIsSearching(false);
          setSelectedItemId(undefined);
          return;
        }
        const predicate = `kMDItemContentType == "public.folder" && kMDItemDisplayName == "*${safeQuery}*"cd`;
        let filteredPaths: string[] = [];

        if (os.platform() === "darwin") {
          try {
            const { stdout } = await execFileAsync("mdfind", ["-onlyin", os.homedir(), predicate], { timeout: 2000 });
            const allPaths = stdout.split("\n").filter(Boolean);
            filteredPaths = allPaths
              .filter((p) => !p.includes("/Library/") && !p.includes("node_modules") && !p.includes(".git"))
              .slice(0, 15);
          } catch {
            // Ignore mdfind errors or timeouts and rely on fallback
          }
        } else if (os.platform() === "win32") {
          try {
            const psScript = `
$searchStr = $env:FILEMOVER_SEARCH
$conn = New-Object -ComObject ADODB.Connection
$rs = New-Object -ComObject ADODB.Recordset
$conn.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';")
$query = "SELECT System.ItemPathDisplay FROM SYSTEMINDEX WHERE System.FileName LIKE '%$searchStr%' AND System.Kind = 'folder'"
$rs.Open($query, $conn)
$count = 0
while (-not $rs.EOF -and $count -lt 30) {
    $path = $rs.Fields.Item("System.ItemPathDisplay").Value
    if ($path) { Write-Output $path }
    $rs.MoveNext()
    $count++
}
$rs.Close()
$conn.Close()
`;
            const { stdout } = await execFileAsync(
              "powershell.exe",
              ["-NoProfile", "-NonInteractive", "-Command", psScript],
              { timeout: 4000, env: { ...process.env, FILEMOVER_SEARCH: safeQuery } },
            );
            const allPaths = stdout
              .split("\n")
              .map((p) => p.trim())
              .filter(Boolean);
            filteredPaths = allPaths
              .filter((p) => !p.includes("node_modules") && !p.includes(".git") && !p.includes("AppData"))
              .slice(0, 15);
          } catch {
            // Ignore powershell errors and rely on fallback
          }
        }

        // Fallback: If mdfind is broken, hangs, or lacks permissions, search common directories manually
        if (filteredPaths.length === 0) {
          const commonPaths = [
            os.homedir(),
            path.join(os.homedir(), "Desktop"),
            path.join(os.homedir(), "Documents"),
            path.join(os.homedir(), "Downloads"),
            path.join(os.homedir(), "Development"),
          ];
          for (const base of commonPaths) {
            try {
              if (fs.existsSync(base)) {
                const entries = await fs.promises.readdir(base, { withFileTypes: true });
                for (const entry of entries) {
                  if (
                    entry.isDirectory() &&
                    entry.name.toLowerCase().includes(safeQuery.toLowerCase()) &&
                    !entry.name.startsWith(".")
                  ) {
                    filteredPaths.push(path.join(base, entry.name));
                  }
                }
              }
            } catch {
              // Ignore read errors
            }
          }
          // Remove exact duplicates and limit
          filteredPaths = Array.from(new Set(filteredPaths)).slice(0, 15);
        }
        const newResults = filteredPaths.map((p) => ({ name: path.basename(p), path: p }));
        setSearchResults(newResults);
        if (newResults.length > 0) {
          setSelectedItemId("search-0");
        } else {
          setSelectedItemId(undefined);
        }
      } catch {
        setSearchResults([]);
        setSelectedItemId(undefined);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  async function updateRecents(folderName: string, folderPath: string) {
    const filtered = recents.filter((r) => r.path !== folderPath);
    const updated = [{ name: folderName, path: folderPath }, ...filtered].slice(0, 4);
    setRecents(updated);
    await LocalStorage.setItem("recents", JSON.stringify(updated));
  }

  async function safeMoveOrCopy(files: string[], destFolder: string, isCopy: boolean) {
    if (!fs.existsSync(destFolder)) {
      await fs.promises.mkdir(destFolder, { recursive: true });
    }

    const errors: { file: string; error: string }[] = [];
    let successCount = 0;
    const historyFiles: { originalPath: string; newPath: string }[] = [];

    for (const src of files) {
      try {
        const basename = path.basename(src);
        let safeName = basename;
        let counter = 1;
        let destPath = path.join(destFolder, safeName);

        if (src === destPath) continue;

        while (fs.existsSync(destPath)) {
          const ext = path.extname(basename);
          const name = path.basename(basename, ext);
          safeName = `${name} (${counter})${ext}`;
          destPath = path.join(destFolder, safeName);
          counter++;
        }

        if (isCopy) {
          await fs.promises.cp(src, destPath, { recursive: true });
        } else {
          try {
            await fs.promises.rename(src, destPath);
          } catch (error) {
            const e = error as NodeJS.ErrnoException;
            if (e.code === "EXDEV") {
              await fs.promises.cp(src, destPath, { recursive: true });
              try {
                await fs.promises.rm(src, { recursive: true });
              } catch (rmError) {
                await fs.promises.rm(destPath, { recursive: true }).catch(() => {});
                throw new Error(
                  `Move failed (could not remove original file). Cleanup attempted. Error: ${rmError instanceof Error ? rmError.message : String(rmError)}`,
                );
              }
            } else {
              throw e;
            }
          }
        }
        successCount++;
        historyFiles.push({ originalPath: src, newPath: destPath });
      } catch (e: unknown) {
        errors.push({
          file: path.basename(src),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { successCount, errors, historyFiles };
  }

  async function safeRenameAndMove(files: string[], destFolder: string, options: RenameOptions) {
    if (!fs.existsSync(destFolder)) {
      await fs.promises.mkdir(destFolder, { recursive: true });
    }

    const errors: { file: string; error: string }[] = [];
    let successCount = 0;
    const historyFiles: { originalPath: string; newPath: string }[] = [];

    let index = 1;
    let dateSuffix = "";
    if (options.appendDate !== "none") {
      const now = new Date();
      if (options.appendDate === "iso") {
        dateSuffix = `_${now.toISOString().split("T")[0]}`;
      } else if (options.appendDate === "eu") {
        dateSuffix = `_${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
      } else if (options.appendDate === "us") {
        dateSuffix = `_${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getFullYear()}`;
      } else if (options.appendDate === "unix") {
        dateSuffix = `_${Math.floor(now.getTime() / 1000)}`;
      }
    }

    for (const src of files) {
      try {
        const ext = path.extname(src);
        const originalBase = path.basename(src, ext);
        let newBase = originalBase;

        if (options.mode === "replace") {
          newBase = options.text;
        } else if (options.mode === "prefix") {
          newBase = `${options.text}${originalBase}`;
        } else if (options.mode === "suffix") {
          newBase = `${originalBase}${options.text}`;
        } else if (options.mode === "find_replace" && options.findText) {
          newBase = originalBase.split(options.findText).join(options.text);
        }

        // Security: Prevent Directory Traversal by stripping path separators from the user input
        newBase = newBase.replace(/[/\\]/g, "_");

        newBase = `${newBase}${dateSuffix}`;

        // Force numbering from the start ONLY for "replace" mode with multiple files
        const forceNumbering = options.mode === "replace" && files.length > 1;

        let safeName = forceNumbering
          ? `${newBase}${formatIndex(index, options.numberFormat)}${ext}`
          : `${newBase}${ext}`;
        let destPath = path.join(destFolder, safeName);

        if (src === destPath) continue;

        let conflictCounter = forceNumbering ? index + 1 : 1;
        while (fs.existsSync(destPath)) {
          // If a file already exists, append an index to resolve the conflict
          safeName = `${newBase}${formatIndex(conflictCounter, options.numberFormat)}${ext}`;
          destPath = path.join(destFolder, safeName);
          conflictCounter++;
        }

        if (forceNumbering) {
          index++;
        }

        try {
          await fs.promises.rename(src, destPath);
        } catch (error) {
          const e = error as NodeJS.ErrnoException;
          if (e.code === "EXDEV") {
            await fs.promises.cp(src, destPath, { recursive: true });
            try {
              await fs.promises.rm(src, { recursive: true });
            } catch (rmError) {
              await fs.promises.rm(destPath, { recursive: true }).catch(() => {});
              throw new Error(
                `Rename failed (could not remove original file). Cleanup attempted. Error: ${rmError instanceof Error ? rmError.message : String(rmError)}`,
              );
            }
          } else {
            throw e;
          }
        }

        successCount++;
        historyFiles.push({ originalPath: src, newPath: destPath });
      } catch (e: unknown) {
        errors.push({
          file: path.basename(src),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { successCount, errors, historyFiles };
  }

  async function handleAction(destinationPath: string, folderName: string, isCopy: boolean) {
    if (selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: `Please select files in ${fileManagerName} first.`,
      });
      return;
    }

    try {
      const { successCount, errors, historyFiles } = await safeMoveOrCopy(selectedFiles, destinationPath, isCopy);

      if (successCount > 0) {
        await updateRecents(folderName, destinationPath);

        await addHistory({
          timestamp: Date.now(),
          type: isCopy ? "copy" : "move",
          destFolder: destinationPath,
          files: historyFiles,
        });
      }

      if (errors.length > 0) {
        const errorMsg = errors.map((err) => `"${err.file}": ${err.error}`).join("; ");
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${isCopy ? "copy" : "move"} some files`,
          message: `Processed ${successCount} of ${selectedFiles.length} files. Errors: ${errorMsg}`,
        });
      } else if (successCount === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files moved",
          message: "All selected files are already in the destination folder",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Files ${isCopy ? "copied" : "moved"} successfully`,
        });
        await closeMainWindow();
        await popToRoot();
      }
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${isCopy ? "copy" : "move"} files`,
        message: String(e),
      });
    }
  }

  async function handleRenameAction(destinationPath: string, folderName: string, options: RenameOptions) {
    if (selectedFiles.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files selected" });
      return;
    }

    try {
      const { successCount, errors, historyFiles } = await safeRenameAndMove(selectedFiles, destinationPath, options);

      if (successCount > 0) {
        await updateRecents(folderName, destinationPath);

        await addHistory({
          timestamp: Date.now(),
          type: "rename",
          destFolder: destinationPath,
          files: historyFiles,
        });
      }

      if (errors.length > 0) {
        const errorMsg = errors.map((err) => `"${err.file}": ${err.error}`).join("; ");
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to rename some files`,
          message: `Processed ${successCount} files. Errors: ${errorMsg}`,
        });
      } else if (successCount === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files renamed or moved",
          message: "All selected files are already in the destination folder",
        });
      } else {
        await showToast({ style: Toast.Style.Success, title: `Files renamed and moved successfully` });
        await closeMainWindow();
        await popToRoot();
      }
    } catch (e: unknown) {
      await showToast({ style: Toast.Style.Failure, title: `Failed to rename files`, message: String(e) });
    }
  }

  async function addFavorite(name: string, folderPath: string) {
    const newFavorites = [...favorites, { name, path: folderPath }];
    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
    await showToast({ title: "Added to favorites" });
  }

  async function removeFavorite(folderPath: string) {
    const newFavorites = favorites.filter((f) => f.path !== folderPath);
    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
    await showToast({ title: "Removed from favorites" });
  }

  async function clearRecents() {
    setRecents([]);
    await LocalStorage.removeItem("recents");
    await showToast({ title: "Recent folders cleared" });
  }

  const fileCount = selectedFiles.length;
  const subtitle = fileCount > 0 ? `${fileCount} file(s) selected` : "No files selected";

  const detailMarkdown =
    selectedFiles.length > 0
      ? `### Files to Move / Copy\n\n${selectedFiles
          .map((f) => `- **${path.basename(f)}**\n  \n  \`${f}\``)
          .join("\n\n")}`
      : `### No files selected.\n\nOpen ${fileManagerName} and select files to move or copy them, or use this extension to manage your favorites.`;

  function getFolderDetail(folderPath: string) {
    return (
      <List.Item.Detail
        markdown={detailMarkdown}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Destination" text={folderPath} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  // FolderActionPanel has been extracted to module level to avoid re-mounting on every render

  return (
    <List
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id !== selectedItemId) setSelectedItemId(id || undefined);
      }}
      isLoading={isLoading || isSearching}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search lists or find directories..."
      isShowingDetail={fileCount > 0}
    >
      {fileCount === 0 && (
        <List.EmptyView
          title="No files selected"
          description={`Select files in ${fileManagerName} or on your Desktop to move them.`}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Undo Last File Move"
                icon={Icon.Undo}
                onAction={performUndo}
                shortcut={{ modifiers: [cmdModifier], key: "z" }}
              />
            </ActionPanel>
          }
        />
      )}

      {!isLoading && (
        <>
          {searchResults.length > 0 && (
            <List.Section title="Search Results">
              {searchResults.map((folder, index) => (
                <List.Item
                  key={`search-${index}`}
                  id={`search-${index}`}
                  title={folder.name}
                  subtitle={folder.path}
                  icon={Icon.Folder}
                  accessories={[{ text: path.dirname(folder.path), tooltip: folder.path }]}
                  detail={getFolderDetail(folder.path)}
                  actions={
                    <FolderActionPanel
                      folder={folder}
                      fileCount={fileCount}
                      favorites={favorites}
                      onAddFavorite={addFavorite}
                      onRemoveFavorite={removeFavorite}
                      onClearRecents={clearRecents}
                      onAction={handleAction}
                      onRenameAction={handleRenameAction}
                    />
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Favorites" subtitle={subtitle}>
            {favorites.map((fav, index) => (
              <List.Item
                key={`fav-${index}`}
                title={fav.name}
                subtitle={fav.path}
                icon={Icon.Star}
                accessories={[{ text: path.dirname(fav.path), tooltip: fav.path }]}
                detail={getFolderDetail(fav.path)}
                actions={
                  <FolderActionPanel
                    folder={fav}
                    fileCount={fileCount}
                    favorites={favorites}
                    onAddFavorite={addFavorite}
                    onRemoveFavorite={removeFavorite}
                    onClearRecents={clearRecents}
                    onAction={handleAction}
                    onRenameAction={handleRenameAction}
                  />
                }
              />
            ))}
          </List.Section>

          {recents.length > 0 && (
            <List.Section title="Recent Folders" subtitle={favorites.length === 0 ? subtitle : ""}>
              {recents.map((folder, index) => (
                <List.Item
                  key={`recent-${index}`}
                  title={folder.name}
                  subtitle={folder.path}
                  icon={Icon.Clock}
                  accessories={[{ text: path.dirname(folder.path), tooltip: folder.path }]}
                  detail={getFolderDetail(folder.path)}
                  actions={
                    <FolderActionPanel
                      folder={folder}
                      isRecent={true}
                      fileCount={fileCount}
                      favorites={favorites}
                      onAddFavorite={addFavorite}
                      onRemoveFavorite={removeFavorite}
                      onClearRecents={clearRecents}
                      onAction={handleAction}
                      onRenameAction={handleRenameAction}
                    />
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Default Folders">
            {DEFAULT_FOLDERS.map((folder, index) => (
              <List.Item
                key={`def-${index}`}
                title={folder.name}
                subtitle={folder.path}
                icon={folder.icon}
                detail={<List.Item.Detail markdown={detailMarkdown} />}
                actions={
                  <ActionPanel>
                    <Action
                      title="Move Files Here"
                      icon={Icon.ArrowRight}
                      onAction={() => handleAction(folder.path, folder.name, false)}
                    />
                    <Action.Push
                      title="Rename & Move Here"
                      icon={Icon.Pencil}
                      target={
                        <RenameAndMoveForm
                          destinationPath={folder.path}
                          folderName={folder.name}
                          onRenameAction={handleRenameAction}
                        />
                      }
                      shortcut={{ modifiers: [cmdModifier], key: "r" }}
                    />
                    <Action
                      title="Copy Files Here"
                      icon={Icon.CopyClipboard}
                      onAction={() => handleAction(folder.path, folder.name, true)}
                      shortcut={{ modifiers: [cmdModifier], key: "d" }}
                    />
                    <Action.Push
                      title="Move to New Folder…"
                      icon={Icon.NewFolder}
                      target={<MoveToNewFolderForm onAction={handleAction} />}
                      shortcut={{ modifiers: [cmdModifier], key: "n" }}
                    />
                    <Action.Push
                      title="Move to Custom Folder…"
                      icon={Icon.Folder}
                      target={<MoveToCustomFolderForm onAction={handleAction} />}
                      shortcut={{ modifiers: [cmdModifier, "shift"], key: "f" }}
                    />
                    <Action.Push
                      title="Add New Favorite…"
                      icon={Icon.Plus}
                      target={<AddFavoriteForm onAddFavorite={addFavorite} />}
                      shortcut={{ modifiers: [cmdModifier, "shift"], key: "n" }}
                    />
                    <Action
                      title="Undo Last File Move"
                      icon={Icon.Undo}
                      onAction={performUndo}
                      shortcut={{ modifiers: [cmdModifier], key: "z" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
            {favorites.length === 0 && (
              <List.Item
                title="Add New Favorite…"
                icon={Icon.Plus}
                detail={<List.Item.Detail markdown={detailMarkdown} />}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Add New Favorite…"
                      icon={Icon.Plus}
                      target={<AddFavoriteForm onAddFavorite={addFavorite} />}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}

// Extracted FolderActionPanel & Forms to module level to prevent re-mounting on every render

interface FolderActionPanelProps {
  folder: { name: string; path: string };
  isRecent?: boolean;
  fileCount: number;
  favorites: { name: string; path: string }[];
  onAddFavorite: (name: string, folderPath: string) => Promise<void>;
  onRemoveFavorite: (folderPath: string) => Promise<void>;
  onClearRecents: () => Promise<void>;
  onAction: (destinationPath: string, folderName: string, isCopy: boolean) => Promise<void>;
  onRenameAction?: (destinationPath: string, folderName: string, options: RenameOptions) => Promise<void>;
}

function FolderActionPanel({
  folder,
  isRecent,
  fileCount,
  favorites,
  onAddFavorite,
  onRemoveFavorite,
  onClearRecents,
  onAction,
  onRenameAction,
}: FolderActionPanelProps) {
  if (fileCount === 0) {
    return (
      <ActionPanel>
        <Action
          title="Undo Last File Move"
          icon={Icon.Undo}
          onAction={performUndo}
          shortcut={{ modifiers: [cmdModifier], key: "z" }}
        />
        <Action.Push
          title="Add to Favorites"
          icon={Icon.Star}
          target={<AddFavoriteForm onAddFavorite={onAddFavorite} />}
        />
        <Action.Push
          title="Move to Custom Folder…"
          icon={Icon.Folder}
          target={<MoveToCustomFolderForm onAction={onAction} />}
          shortcut={{ modifiers: [cmdModifier, "shift"], key: "f" }}
        />
        {favorites.some((f) => f.path === folder.path) && (
          <Action
            title="Remove from Favorites"
            icon={Icon.Trash}
            onAction={() => onRemoveFavorite(folder.path)}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        )}
        {isRecent && (
          <Action
            title="Clear All Recents"
            icon={Icon.Trash}
            onAction={onClearRecents}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <Action
        title="Move Files Here"
        icon={Icon.ArrowRight}
        onAction={() => onAction(folder.path, folder.name, false)}
      />
      {onRenameAction && (
        <Action.Push
          title="Rename & Move Here"
          icon={Icon.Pencil}
          target={
            <RenameAndMoveForm destinationPath={folder.path} folderName={folder.name} onRenameAction={onRenameAction} />
          }
          shortcut={{ modifiers: [cmdModifier], key: "r" }}
        />
      )}
      <Action
        title="Copy Files Here"
        icon={Icon.CopyClipboard}
        onAction={() => onAction(folder.path, folder.name, true)}
        shortcut={{ modifiers: [cmdModifier], key: "d" }}
      />
      <Action.Push
        title="Move to New Folder…"
        icon={Icon.NewFolder}
        target={<MoveToNewFolderForm onAction={onAction} />}
        shortcut={{ modifiers: [cmdModifier], key: "n" }}
      />
      <Action.Push
        title="Move to Custom Folder…"
        icon={Icon.Folder}
        target={<MoveToCustomFolderForm onAction={onAction} />}
        shortcut={{ modifiers: [cmdModifier, "shift"], key: "f" }}
      />
      <Action.Push
        title="Add to Favorites"
        icon={Icon.Star}
        target={<AddFavoriteForm onAddFavorite={onAddFavorite} initialFolder={folder.path} initialName={folder.name} />}
        shortcut={{ modifiers: [cmdModifier, "shift"], key: "a" }}
      />
      <Action
        title="Undo Last File Move"
        icon={Icon.Undo}
        onAction={performUndo}
        shortcut={{ modifiers: [cmdModifier], key: "z" }}
      />
      {favorites.some((f) => f.path === folder.path) && (
        <Action
          title="Remove from Favorites"
          icon={Icon.Trash}
          onAction={() => onRemoveFavorite(folder.path)}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      )}
      {isRecent && (
        <Action
          title="Clear All Recents"
          icon={Icon.Trash}
          onAction={onClearRecents}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
        />
      )}
    </ActionPanel>
  );
}

interface AddFavoriteFormProps {
  onAddFavorite: (name: string, folderPath: string) => Promise<void>;
  initialFolder?: string;
  initialName?: string;
}

function AddFavoriteForm({ onAddFavorite, initialFolder, initialName }: AddFavoriteFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Favorite"
            onSubmit={async (values: { name: string; folder: string[] }) => {
              if (values.folder.length > 0 && values.name) {
                await onAddFavorite(values.name, values.folder[0]);
                pop();
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Please fill all fields",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Work Projects" defaultValue={initialName} />
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={initialFolder ? [initialFolder] : undefined}
      />
    </Form>
  );
}

interface MoveToCustomFolderFormProps {
  onAction: (destinationPath: string, folderName: string, isCopy: boolean) => Promise<void>;
}

function MoveToCustomFolderForm({ onAction }: MoveToCustomFolderFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Move / Copy Files"
            onSubmit={async (values: { folder: string[]; copy: boolean }) => {
              if (values.folder.length > 0) {
                const targetFolder = values.folder[0];
                await onAction(targetFolder, path.basename(targetFolder), values.copy);
                pop();
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Please select a destination folder",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Destination Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
      <Form.Checkbox id="copy" label="Copy instead of move" defaultValue={false} />
    </Form>
  );
}

interface MoveToNewFolderFormProps {
  onAction: (destinationPath: string, folderName: string, isCopy: boolean) => Promise<void>;
}

function MoveToNewFolderForm({ onAction }: MoveToNewFolderFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create & Move/Copy Files"
            onSubmit={async (values: { name: string; parentFolder: string[]; copy: boolean }) => {
              if (values.name && values.parentFolder.length > 0) {
                const safeName = path.basename(values.name);
                if (!safeName || safeName === "." || safeName === "..") {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid folder name",
                  });
                  return;
                }
                const newFolderPath = path.join(values.parentFolder[0], safeName);
                await onAction(newFolderPath, safeName, values.copy);
                pop();
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Please provide a name and location",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="New Folder Name" placeholder="e.g. New Project" />
      <Form.FilePicker
        id="parentFolder"
        title="Location"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={[path.join(os.homedir(), "Desktop")]}
      />
      <Form.Checkbox id="copy" label="Copy instead of move" defaultValue={false} />
    </Form>
  );
}

interface RenameAndMoveFormProps {
  destinationPath: string;
  folderName: string;
  onRenameAction: (dest: string, folder: string, options: RenameOptions) => Promise<void>;
}

function RenameAndMoveForm({ destinationPath, folderName, onRenameAction }: RenameAndMoveFormProps) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<RenameOptions["mode"]>("replace");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename & Move"
            onSubmit={async (values: RenameOptions) => {
              if (values.mode === "replace" && !values.text && values.appendDate === "none") {
                await showToast({ style: Toast.Style.Failure, title: "Please enter a base name or select a date" });
                return;
              }
              if (values.mode === "find_replace" && !values.findText) {
                await showToast({ style: Toast.Style.Failure, title: "Please enter text to find" });
                return;
              }
              if (values.mode === "find_replace" && !values.text && values.appendDate === "none") {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Please enter replacement text or append a date to avoid empty filenames",
                });
                return;
              }
              await onRenameAction(destinationPath, folderName, values);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Moving files to ${folderName}`} />

      <Form.Dropdown
        id="mode"
        title="Rename Mode"
        value={mode}
        onChange={(newValue) => setMode(newValue as RenameOptions["mode"])}
      >
        <Form.Dropdown.Item value="replace" title="Replace Entirely" />
        <Form.Dropdown.Item value="prefix" title="Add Prefix" />
        <Form.Dropdown.Item value="suffix" title="Add Suffix" />
        <Form.Dropdown.Item value="find_replace" title="Find & Replace" />
      </Form.Dropdown>

      {mode === "find_replace" && <Form.TextField id="findText" title="Find Text" placeholder="e.g. IMG_" />}

      <Form.TextField
        id="text"
        title={mode === "replace" ? "New Base Name" : mode === "find_replace" ? "Replace With" : "Text"}
        placeholder={mode === "replace" ? "e.g. Invoice" : mode === "find_replace" ? "e.g. Holiday_" : "e.g. text"}
      />

      {mode === "replace" && (
        <Form.Dropdown id="numberFormat" title="Numbering Format" defaultValue="brackets">
          <Form.Dropdown.Item value="brackets" title="(1), (2), (3)" />
          <Form.Dropdown.Item value="dash" title="-1, -2, -3" />
          <Form.Dropdown.Item value="underscore" title="_1, _2, _3" />
          <Form.Dropdown.Item value="padded" title="_01, _02, _03" />
        </Form.Dropdown>
      )}

      <Form.Dropdown id="appendDate" title="Append Date" defaultValue="none">
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="iso" title="YYYY-MM-DD (e.g. 2026-06-09)" />
        <Form.Dropdown.Item value="eu" title="DD.MM.YYYY (e.g. 09.06.2026)" />
        <Form.Dropdown.Item value="us" title="MM-DD-YYYY (e.g. 06-09-2026)" />
        <Form.Dropdown.Item value="unix" title="UNIX Timestamp" />
      </Form.Dropdown>
    </Form>
  );
}
