import { useState, useEffect } from "react";
import { List, Action, ActionPanel, Icon, Color, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

const INSTALLER_EXTENSIONS = [".dmg", ".pkg", ".mpkg", ".iso", ".xip", ".zip"];
const INSTALLER_SCAN_MAX_DEPTH = 8;
const INSTALLER_PATHS = [
  path.join(os.homedir(), "Downloads"),
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
  path.join(os.homedir(), "Public"),
  path.join(os.homedir(), "Library/Downloads"),
  "/Users/Shared",
  "/Users/Shared/Downloads",
  path.join(os.homedir(), "Library/Caches/Homebrew"),
  path.join(os.homedir(), "Library/Mobile Documents/com~apple~CloudDocs/Downloads"),
  path.join(os.homedir(), "Library/Containers/com.apple.mail/Data/Library/Mail Downloads"),
  path.join(os.homedir(), "Library/Application Support/Telegram Desktop"),
  path.join(os.homedir(), "Downloads/Telegram Desktop"),
];

interface InstallerFile {
  filePath: string;
  size: number;
  source: string;
  displayName: string;
}

function getSourceDisplay(filePath: string): string {
  const dirPath = path.dirname(filePath);
  const home = os.homedir();
  if (dirPath.startsWith(path.join(home, "Downloads"))) return "Downloads";
  if (dirPath.startsWith(path.join(home, "Desktop"))) return "Desktop";
  if (dirPath.startsWith(path.join(home, "Documents"))) return "Documents";
  if (dirPath.startsWith(path.join(home, "Public"))) return "Public";
  if (dirPath.startsWith(path.join(home, "Library/Downloads"))) return "Library";
  if (dirPath.startsWith("/Users/Shared")) return "Shared";
  if (dirPath.startsWith(path.join(home, "Library/Caches/Homebrew"))) return "Homebrew";
  if (dirPath.startsWith(path.join(home, "Library/Mobile Documents/com~apple~CloudDocs/Downloads"))) return "iCloud";
  if (dirPath.startsWith(path.join(home, "Library/Containers/com.apple.mail"))) return "Mail";
  if (dirPath.includes("Telegram Desktop")) return "Telegram";
  return path.basename(dirPath);
}

function bytesToHuman(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function isInstallerZip(filePath: string): Promise<boolean> {
  // Only check first N entries for installer patterns
  const MAX_ZIP_ENTRIES = 50;
  try {
    const { stdout } = await execFileAsync("unzip", ["-Z", "-1", filePath]);
    const lines = stdout.split("\n").slice(0, MAX_ZIP_ENTRIES);
    return lines.some((line) => /\.(app|pkg|dmg|xip)(\/|$)/.test(line));
  } catch {
    return false;
  }
}

async function scanInstallersInPath(scanPath: string, maxDepth: number, found: InstallerFile[]) {
  async function walk(currentPath: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: Awaited<ReturnType<typeof fs.readdir>> = [];
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (INSTALLER_EXTENSIONS.includes(ext)) {
          if (ext === ".zip") {
            const stat = await fs.stat(entryPath);
            if (await isInstallerZip(entryPath)) {
              found.push({
                filePath: entryPath,
                size: stat.size,
                source: getSourceDisplay(entryPath),
                displayName: path.basename(entryPath),
              });
            }
          } else {
            const stat = await fs.stat(entryPath);
            found.push({
              filePath: entryPath,
              size: stat.size,
              source: getSourceDisplay(entryPath),
              displayName: path.basename(entryPath),
            });
          }
        }
      }
    }
  }
  await walk(scanPath, 1);
}

async function scanAllInstallers(): Promise<InstallerFile[]> {
  const found: InstallerFile[] = [];
  for (const scanPath of INSTALLER_PATHS) {
    await scanInstallersInPath(scanPath, INSTALLER_SCAN_MAX_DEPTH, found);
  }
  // Deduplicate and sort
  const unique = Array.from(new Map(found.map((f) => [f.filePath, f])).values());
  unique.sort((a, b) => b.size - a.size);
  // Homebrew hash strip
  for (const f of unique) {
    if (f.source === "Homebrew" && /^[0-9a-f]{64}--(.+)$/.test(f.displayName)) {
      f.displayName = f.displayName.replace(/^[0-9a-f]{64}--/, "");
    }
  }
  return unique;
}

export default function InstallerCleanup() {
  const [installers, setInstallers] = useState<InstallerFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadInstallers();
  }, []);

  async function loadInstallers() {
    setIsLoading(true);
    const files = await scanAllInstallers();
    setInstallers(files);
    setIsLoading(false);
    setSelected(new Set());
    if (files.length > 0) {
      await showToast({ style: Toast.Style.Success, title: `Found ${files.length} installer files` });
    } else {
      await showToast({ style: Toast.Style.Success, title: `No installer files found` });
    }
  }

  function toggleSelection(filePath: string) {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) newSet.delete(filePath);
      else newSet.add(filePath);
      return newSet;
    });
  }

  async function selectAll() {
    const filtered = filteredInstallers();
    if (filtered.length > 0) {
      const confirmed = await confirmAlert({
        title: "Warning: Dangerous Operation",
        message:
          "You are about to select all installer files for deletion. This action cannot be undone. Are you sure you want to proceed?",
        primaryAction: { title: "Select All", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    setSelected(new Set(filtered.map((f) => f.filePath)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  function filteredInstallers() {
    return installers.filter((f) =>
      searchText ? f.displayName.toLowerCase().includes(searchText.toLowerCase()) : true,
    );
  }

  async function deleteSelectedInstallers() {
    if (selected.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select at least one installer file to delete",
      });
      return;
    }
    const selectedList = installers.filter((f) => selected.has(f.filePath));
    const confirmed = await confirmAlert({
      title: `Delete ${selected.size} installer(s)?`,
      message: `This will permanently remove:\n${selectedList.map((f) => `• ${f.displayName}`).join("\n")}`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${selected.size} installer(s)...` });
    let deleted = 0;
    let totalSize = 0;
    for (const file of selectedList) {
      try {
        await fs.unlink(file.filePath);
        deleted++;
        totalSize += file.size;
      } catch {
        // ignore
      }
    }
    toast.style = Toast.Style.Success;
    toast.title = `Deleted ${deleted} installer(s)`;
    toast.message = `Freed ${bytesToHuman(totalSize)}`;
    await loadInstallers();
  }

  const filtered = filteredInstallers();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search installer files..."
      navigationTitle={`Cleanup Installers${selected.size > 0 ? ` (${selected.size} selected)` : ""}`}
    >
      <List.Section title={`${filtered.length} Installer Files`}>
        {filtered.map((file) => {
          const isSelected = selected.has(file.filePath);
          return (
            <List.Item
              key={file.filePath}
              icon={{
                source: isSelected ? Icon.CheckCircle : Icon.Circle,
                tintColor: isSelected ? Color.Green : Color.SecondaryText,
              }}
              title={file.displayName}
              subtitle={file.source}
              accessories={[{ text: bytesToHuman(file.size) }]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggleSelection(file.filePath)}
                  />
                  <Action
                    title={`Delete ${selected.size > 0 ? `${selected.size} Installer(s)` : "Selected"}`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={deleteSelectedInstallers}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Select All"
                      icon={Icon.CheckCircle}
                      onAction={selectAll}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                    />
                    <Action
                      title="Deselect All"
                      icon={Icon.Circle}
                      onAction={deselectAll}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh List"
                      icon={Icon.ArrowClockwise}
                      onAction={loadInstallers}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.ShowInFinder path={file.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
