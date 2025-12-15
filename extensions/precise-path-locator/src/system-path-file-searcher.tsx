import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect } from "react";
import path from "path";
import fs from "fs";

interface FileResult {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  created: number;
  modified: number;
  lastAccessed: number;
}

interface NavigationRoot {
  path: string;
  name: string;
}

interface ExecOutput {
  stdout: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [directoryContent, setDirectoryContent] = useState<FileResult[]>([]);

  const [navRoot, setNavRoot] = useState<NavigationRoot | null>(null);

  // 1. EXIT MONITOR (BACKSPACE)
  useEffect(() => {
    if (navRoot && !searchText.startsWith(navRoot.name)) {
      setNavRoot(null);
    }
  }, [searchText, navRoot]);

  // 2. GLOBAL SEARCH LOGIC
  const showGlobalSearch = !navRoot;
  const searchCommand = showGlobalSearch ? `mdfind -name "${searchText}" | head -n 40` : "";

  const { data: searchResults, isLoading: isSearching } = useExec(searchCommand, [], {
    execute: showGlobalSearch && !!searchText,
    shell: true,
    parseOutput: (output) => parseMdfindOutput(output),
  });

  // --- STRICT FILTER ---
  const filteredSearchResults = searchResults?.filter((file) =>
    file.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // 3. DYNAMIC RESOLVER (NAVIGATION)
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  useEffect(() => {
    async function resolveNavigation() {
      if (!navRoot) {
        setResolvedPath(null);
        return;
      }

      const relativeString = searchText.slice(navRoot.name.length);
      const lastSlashIndex = relativeString.lastIndexOf("/");

      const dirPart = relativeString.substring(0, lastSlashIndex);
      const filterPart = relativeString.substring(lastSlashIndex + 1);

      const targetReadPath = path.join(navRoot.path, dirPart);

      if (fs.existsSync(targetReadPath)) {
        setResolvedPath(targetReadPath);

        try {
          const dirFiles = await fs.promises.readdir(targetReadPath, { withFileTypes: true });

          const mappedFiles: FileResult[] = dirFiles
            .map((dirent) => {
              const fullPath = path.join(targetReadPath, dirent.name);
              if (dirent.name.startsWith(".")) return null;

              let stats;
              try {
                stats = fs.statSync(fullPath);
              } catch {
                return null;
              } // Corregido: eliminado (e)

              return {
                name: dirent.name,
                path: fullPath,
                isDir: dirent.isDirectory(),
                size: stats.size,
                created: stats.birthtimeMs,
                modified: stats.mtimeMs,
                lastAccessed: stats.atimeMs,
              };
            })
            .filter((f): f is FileResult => f !== null);

          const sorted = mappedFiles.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });

          const filtered = sorted.filter((f) => f.name.toLowerCase().includes(filterPart.toLowerCase()));

          setDirectoryContent(filtered);
        } catch (error) {
          console.error("Error reading directory:", error);
          setDirectoryContent([]);
        }
      }
    }

    resolveNavigation();
  }, [searchText, navRoot]);

  // --- RENDERING CONFIGURATION ---
  const finalData = resolvedPath ? directoryContent : filteredSearchResults;
  const isLoading = isSearching && !resolvedPath;

  const sectionTitle = resolvedPath ? undefined : "Files";

  const shouldShowDetail = finalData !== undefined && finalData.length > 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Search files..."
      throttle
      isShowingDetail={shouldShowDetail}
    >
      <List.Section title={sectionTitle}>
        {finalData?.map((file) => (
          <List.Item
            key={file.path}
            title={file.name}
            icon={{ fileIcon: file.path }}
            quickLook={{ path: file.path, name: file.name }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={file.name} />
                    <List.Item.Detail.Metadata.Label title="Where" text={path.dirname(file.path)} />
                    <List.Item.Detail.Metadata.Label title="Type" text={file.isDir ? "Folder" : "File"} />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Created" text={new Date(file.created).toLocaleString()} />
                    <List.Item.Detail.Metadata.Label title="Modified" text={new Date(file.modified).toLocaleString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Last Opened"
                      text={new Date(file.lastAccessed).toLocaleString()}
                    />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Size" text={file.isDir ? "--" : formatBytes(file.size)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {/* 1. Enter: OPEN */}
                <Action.Open title="Open" target={file.path} />

                {/* 2. Cmd+Enter: NAVIGATE */}
                {file.isDir && (
                  <Action
                    title="Navigate Folder"
                    icon={Icon.Folder}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => {
                      if (!navRoot) {
                        setNavRoot({ path: file.path, name: file.name });
                        setSearchText(file.name + "/");
                      } else {
                        const currentBase = searchText.substring(0, searchText.lastIndexOf("/") + 1);
                        setSearchText(currentBase + file.name + "/");
                      }
                    }}
                  />
                )}

                <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />

                <Action.CopyToClipboard content={file.path} title="Copy Path" />
                <Action.ToggleQuickLook title="Quick Look" shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// Helper to format file size nicely
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Helper to parse mdfind output
function parseMdfindOutput(output: ExecOutput): FileResult[] {
  const lines = output.stdout.split("\n").filter((line: string) => line.trim() !== "");
  const parsed = lines
    .map((filePath: string) => {
      const cleanPath = filePath.trim();
      let stats;
      try {
        if (fs.existsSync(cleanPath)) {
          stats = fs.statSync(cleanPath);
        } else {
          return null;
        }
      } catch {
        return null;
      } // Corregido: eliminado (e)

      return {
        path: cleanPath,
        name: path.basename(cleanPath),
        isDir: stats.isDirectory(),
        size: stats.size,
        created: stats.birthtimeMs,
        modified: stats.mtimeMs,
        lastAccessed: stats.atimeMs || stats.mtimeMs,
      };
    })
    // Filter out nulls and Downloads folder
    .filter((f): f is FileResult => f !== null && f.path.startsWith("/") && !f.path.includes("/Downloads/"));

  return parsed.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return b.lastAccessed - a.lastAccessed;
  });
}
