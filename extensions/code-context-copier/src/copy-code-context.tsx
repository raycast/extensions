import { Action, ActionPanel, List, Toast, showToast, Clipboard, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs/promises";
import path from "path";
import ignore from "ignore";

interface FileItem {
  path: string;
  name: string;
  isDirectory: boolean;
}

const LAST_DIRECTORY_KEY = "last-visited-directory";
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB

const ig = ignore().add([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".DS_Store",
  "*.log",
  "coverage",
  ".next",
  ".cache",
  ".env",
]);

async function getAllFilesRecursively(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentPath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (ig.ignores(entry.name)) continue;

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          try {
            const stats = await fs.stat(fullPath);
            if (stats.size <= MAX_FILE_SIZE) {
              files.push(fullPath);
            }
          } catch (error) {
            console.error(`Error reading file stats for ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error traversing directory ${currentPath}:`, error);
    }
  }

  await traverse(dirPath);
  return files;
}

async function getFilesFromSelectedPaths(selectedPaths: Set<string>): Promise<string[]> {
  const allFiles: string[] = [];

  for (const selectedPath of selectedPaths) {
    try {
      const stats = await fs.stat(selectedPath);

      if (stats.isDirectory()) {
        const files = await getAllFilesRecursively(selectedPath);
        allFiles.push(...files);
      } else if (stats.size <= MAX_FILE_SIZE) {
        allFiles.push(selectedPath);
      }
    } catch (error) {
      console.error(`Error processing path ${selectedPath}:`, error);
    }
  }

  return allFiles;
}

export default function Command() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function initializeDirectory() {
      try {
        const lastDir = await LocalStorage.getItem(LAST_DIRECTORY_KEY);
        if (lastDir) {
          try {
            await fs.access(lastDir as string);
            setCurrentPath(lastDir as string);
            return;
          } catch {
            await LocalStorage.removeItem(LAST_DIRECTORY_KEY);
          }
        }
      } catch (error) {
        console.error("Error loading last directory:", error);
      }

      setCurrentPath(process.env.HOME || "");
    }

    initializeDirectory();
  }, []);

  useEffect(() => {
    if (currentPath) {
      LocalStorage.setItem(LAST_DIRECTORY_KEY, currentPath);
    }
  }, [currentPath]);

  async function loadCurrentDirectory() {
    if (!currentPath) return;

    try {
      setIsLoading(true);
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      const filteredEntries = entries.filter((entry) => !entry.name.startsWith(".") && !ig.ignores(entry.name));

      const items: FileItem[] = filteredEntries.map((entry) => ({
        path: path.join(currentPath, entry.name),
        name: entry.name,
        isDirectory: entry.isDirectory(),
      }));

      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!b.isDirectory && a.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setItems(items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load directory",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentDirectory();
  }, [currentPath]);

  const navigateToParent = () => {
    const parentPath = path.dirname(currentPath);
    setCurrentPath(parentPath);
  };

  const navigateToDirectory = (dirPath: string) => {
    setCurrentPath(dirPath);
  };

  const toggleSelection = (path: string) => {
    setSelectedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split(path.sep);
    return parts.filter(Boolean).join(" → ");
  };

  async function copySelectedContents() {
    try {
      setIsLoading(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Scanning selected items...",
      });

      const files = await getFilesFromSelectedPaths(selectedPaths);

      if (files.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No suitable files found",
          message: "Selected items might be empty or files too large",
        });
        return;
      }

      let content = "";
      let totalSize = 0;
      let filesProcessed = 0;

      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);

          if (totalSize + stats.size > MAX_TOTAL_SIZE) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Size limit reached",
              message: `Processed ${filesProcessed} files. Remaining files skipped.`,
            });
            break;
          }

          const fileContent = await fs.readFile(filePath, "utf-8");
          const relativePath = path.relative(currentPath, filePath);
          content += `\n--- File: ${relativePath} ---\n${fileContent}\n`;
          totalSize += stats.size;
          filesProcessed++;
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      }

      if (content) {
        await Clipboard.copy(content);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to clipboard",
          message: `${filesProcessed} files copied`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy contents",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter items..."
      navigationTitle={getBreadcrumbs()}
      actions={
        selectedPaths.size > 0 ? (
          <ActionPanel>
            <Action
              title={`Copy Selected (${selectedPaths.size} Items)`}
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "k" }}
              onAction={copySelectedContents}
            />
          </ActionPanel>
        ) : null
      }
    >
      {currentPath !== process.env.HOME && (
        <List.Item
          title=".."
          icon={Icon.ArrowUp}
          accessories={[{ text: "Parent Directory" }]}
          actions={
            <ActionPanel>
              <Action title="Go up" onAction={navigateToParent} shortcut={{ modifiers: ["cmd"], key: "b" }} />
            </ActionPanel>
          }
        />
      )}

      {selectedPaths.size > 0 && (
        <List.Item
          title={`Selected ${selectedPaths.size} items`}
          icon={Icon.Checkmark}
          accessories={[{ text: "⌘K to Copy" }]}
          actions={
            <ActionPanel>
              <Action
                title={`Copy Selected Contents (${selectedPaths.size} Items)`}
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
                onAction={copySelectedContents}
              />
              <Action
                title="Clear Selection"
                icon={Icon.Xmark}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setSelectedPaths(new Set())}
              />
            </ActionPanel>
          }
        />
      )}

      {items.map((item) => (
        <List.Item
          key={item.path}
          title={item.name}
          subtitle={selectedPaths.has(item.path) ? "Selected" : undefined}
          icon={item.isDirectory ? Icon.Folder : Icon.Document}
          accessories={[
            {
              icon: selectedPaths.has(item.path) ? Icon.Checkmark : undefined,
              tooltip: selectedPaths.has(item.path) ? "Selected" : "Press ⌘S to select",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {item.isDirectory ? (
                  <>
                    <Action
                      title="Open Directory"
                      icon={Icon.ArrowRight}
                      onAction={() => navigateToDirectory(item.path)}
                    />
                    <Action
                      title={selectedPaths.has(item.path) ? "Deselect Directory" : "Select Directory"}
                      icon={selectedPaths.has(item.path) ? Icon.XMarkCircle : Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => toggleSelection(item.path)}
                    />
                  </>
                ) : (
                  <Action
                    title={selectedPaths.has(item.path) ? "Deselect File" : "Select File"}
                    icon={selectedPaths.has(item.path) ? Icon.XMarkCircle : Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => toggleSelection(item.path)}
                  />
                )}
              </ActionPanel.Section>

              {selectedPaths.size > 0 && (
                <ActionPanel.Section>
                  <Action
                    title={`Copy Selected (${selectedPaths.size} Items)`}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "k" }}
                    onAction={copySelectedContents}
                  />
                  <Action
                    title="Clear Selection"
                    icon={Icon.Xmark}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setSelectedPaths(new Set())}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
