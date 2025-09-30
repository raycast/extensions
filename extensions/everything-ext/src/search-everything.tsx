import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { exec, execFile } from "child_process";
import { readFile, readdir, stat } from "fs/promises";
import { promisify } from "util";
import { basename, dirname, extname, join } from "path";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Known text file extensions for fast path detection
const KNOWN_TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".log",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".sh",
  ".bat",
  ".ps1",
  ".sql",
  ".csv",
  ".conf",
  ".properties",
]);

async function isTextFile(filePath: string): Promise<boolean> {
  try {
    const buffer = await readFile(filePath, { encoding: null });
    const sample = buffer.slice(0, Math.min(512, buffer.length));

    // Check for null bytes (binary indicator)
    const nullBytes = sample.filter((byte) => byte === 0).length;

    // If more than 1% null bytes, likely binary
    return nullBytes / sample.length < 0.01;
  } catch {
    return false;
  }
}

async function isFilePreviewable(filePath: string, fileSize?: number): Promise<boolean> {
  const ext = extname(filePath).toLowerCase();

  // Known text extensions - fast path
  if (KNOWN_TEXT_EXTENSIONS.has(ext)) return true;

  // Unknown extension or no extension - content detection for small files only
  if ((!ext || !KNOWN_TEXT_EXTENSIONS.has(ext)) && fileSize && fileSize < 10000) {
    return await isTextFile(filePath);
  }

  return false;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function truncatePath(path: string, maxLength = 50): string {
  if (path.length <= maxLength) return path;

  const pathSeparator = path.includes("\\") ? "\\" : "/";
  const parts = path.split(pathSeparator);

  if (parts.length <= 3) return path;

  // Always keep the first two parts (drive + first folder) and last part
  const first = parts[0];
  const second = parts[1];
  const last = parts[parts.length - 1];
  const ellipsis = "...";

  // Build: first + separator + second + separator + ellipsis + separator + last
  const basicTruncated = `${first}${pathSeparator}${second}${pathSeparator}${ellipsis}${pathSeparator}${last}`;
  if (basicTruncated.length <= maxLength) {
    return basicTruncated;
  }

  // If still too long, truncate the last part
  const fixedPart = `${first}${pathSeparator}${second}${pathSeparator}${ellipsis}${pathSeparator}`;
  const availableSpace = maxLength - fixedPart.length;
  if (availableSpace > 0) {
    const truncatedLast = last.length > availableSpace ? last.substring(0, availableSpace - 3) + "..." : last;
    return `${fixedPart}${truncatedLast}`;
  }

  // If extremely long, just show first two parts with ellipsis
  return `${first}${pathSeparator}${second}${pathSeparator}${ellipsis}`;
}

function parseEsDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Parse date format: "22/07/2025 16:18"
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/);
  if (!match) return undefined;

  const [, day, month, year, hour, minute] = match;
  // JavaScript Date constructor expects month to be 0-indexed
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
}

interface FileInfo {
  name: string;
  commandline: string;
  size?: number;
  dateCreated?: Date;
  dateModified?: Date;
  isDirectory?: boolean;
}

async function loadFilesList(searchText: string, preferences: Preferences): Promise<FileInfo[]> {
  if (!searchText) {
    return [];
  }

  const { esExePath, defaultSort } = preferences;

  try {
    const esCommand = esExePath || "es.exe";

    // Use a secure approach that handles spaces correctly
    // Everything CLI works best with individual search terms (not quoted phrases)
    // This allows "acn 2019" to find "acn doc 2019"

    // Sanitize each search term individually to prevent injection
    const searchTerms = searchText.split(/\s+/).filter((term) => term.trim());
    const sanitizedTerms = searchTerms.map((term) => term.replace(/[&|;$`\\"`'<>]/g, (match) => `\\${match}`));

    // Build command with individual search terms (Everything will AND them together)
    const baseCommand = `chcp 65001 > nul && "${esCommand}" -n 100 -csv -name -filename-column -size -date-created -date-modified`;
    const sortCommand = defaultSort ? ` ${defaultSort}` : "";
    const searchCommand = sanitizedTerms.length > 0 ? ` ${sanitizedTerms.join(" ")}` : "";

    const fullCommand = baseCommand + sortCommand + searchCommand;

    const { stdout } = await execAsync(fullCommand);

    const lines = stdout
      .trim()
      .split(/\r?\n/)
      .filter((line) => line);

    // Skip header line and parse CSV data
    const dataLines = lines.slice(1);

    const results = await Promise.all(
      dataLines.map(async (line) => {
        // Parse CSV line (handle quoted values that may contain commas)
        const csvRegex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
        const values: string[] = [];
        let match;

        while ((match = csvRegex.exec(line)) !== null) {
          values.push(match[1] || match[2] || "");
        }

        if (values.length < 5) {
          // Fallback if CSV parsing fails
          const fullPath = values[0] || line;
          // Check if it's a directory
          let isDirectory = false;
          try {
            const stats = await stat(fullPath);
            isDirectory = stats.isDirectory();
          } catch {
            // If stat fails, assume it's a file
          }
          return {
            name: basename(fullPath),
            commandline: fullPath,
            isDirectory,
          };
        }

        const [fileName, fullPath, sizeStr, dateCreatedStr, dateModifiedStr] = values;

        // Check if it's a directory
        let isDirectory = false;
        try {
          const stats = await stat(fullPath);
          isDirectory = stats.isDirectory();
        } catch {
          // If stat fails, assume it's a file
        }

        return {
          name: fileName || basename(fullPath),
          commandline: fullPath,
          size: sizeStr && !isDirectory ? parseInt(sizeStr, 10) : undefined,
          dateCreated: parseEsDate(dateCreatedStr),
          dateModified: parseEsDate(dateModifiedStr),
          isDirectory,
        };
      }),
    );
    return results;
  } catch (error) {
    console.log(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const hasStderr = error && typeof error === "object" && "stderr" in error;
    const stderr = hasStderr ? String(error.stderr) : "";

    // Check if es.exe command is not recognized (Windows) or not found (Unix-like)
    if (
      stderr.includes("not recognized") ||
      stderr.includes("command not found") ||
      errorMessage.includes("not recognized")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: esExePath ? "Custom es.exe path not found" : "'es.exe' not found",
        message: esExePath
          ? `Cannot find es.exe at: ${esExePath}`
          : "Please ensure Everything's command-line tool is in your system's PATH or set a custom path in preferences.",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Searching Files",
        message: errorMessage,
      });
    }
    return [];
  }
}

async function openFileFound(fileInfo: FileInfo) {
  try {
    await open(fileInfo.commandline);
    await showToast({
      style: Toast.Style.Success,
      title: "Opening File",
      message: `Opened ${fileInfo.name}`,
    });
  } catch (error) {
    // if the error is related to permissions, run as administrator
    if (
      error instanceof Error &&
      (error.message.includes("The requested operation requires elevation.") ||
        error.message.includes("请求的操作需要提升。")) &&
      fileInfo.commandline.toLowerCase().endsWith(".exe")
    ) {
      await runAsAdministrator(fileInfo.commandline);
      return;
    }

    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Opening File",
      message: `Failed to open ${fileInfo.name}`,
    });
  }
}

async function runAsAdministrator(path: string) {
  const command = `powershell -Command "Start-Process -FilePath '${path.replace(/'/g, "''")}' -Verb RunAs"`;
  execAsync(command);
}

async function showInExplorer(path: string, preferences: Preferences) {
  const { fileExplorerCommand } = preferences;
  // For files, show the containing directory; for directories, show the directory itself
  const targetPath = dirname(path);

  if (fileExplorerCommand) {
    try {
      const commandParts = fileExplorerCommand.match(/"[^"]+"|\S+/g) || [];
      if (commandParts.length === 0) {
        throw new Error("File explorer command is invalid.");
      }

      const executable = commandParts[0]!.replace(/"/g, "");
      const args = commandParts.slice(1).map((arg) => arg.replace("%s", targetPath));

      await execFileAsync(executable, args);
    } catch (error) {
      console.log(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Opening in Custom Explorer",
        message: error instanceof Error ? error.message : `Failed to execute: ${fileExplorerCommand}`,
      });
    }
  } else {
    await open(targetPath);
  }
}

async function copyFileWithApi(fileInfo: FileInfo) {
  try {
    await Clipboard.copy({ file: fileInfo.commandline });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: `Copied ${fileInfo.name}`,
    });
  } catch (error) {
    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Copying File",
      message: "Could not copy the file to the clipboard.",
    });
  }
}

async function loadDirectoryContents(dirPath: string): Promise<FileInfo[]> {
  try {
    const entries = await readdir(dirPath);
    const results: FileInfo[] = [];

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        results.push({
          name: entry,
          commandline: fullPath,
          size: stats.isFile() ? stats.size : undefined,
          dateCreated: stats.birthtime,
          dateModified: stats.mtime,
          isDirectory: stats.isDirectory(),
        });
      } catch (error) {
        // Skip entries we can't access
        console.log(`Skipping ${fullPath}: ${error}`);
      }
    }

    // Sort directories first, then files
    return results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Reading Directory",
      message: error instanceof Error ? error.message : "Failed to read directory contents",
    });
    return [];
  }
}

function DirectoryBrowser({ directoryPath, preferences }: { directoryPath: string; preferences: Preferences }) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const openFolderAsDefault = preferences?.openFolderAsDefault;
  const { pop } = useNavigation();

  const { data: directoryContents, isLoading } = useCachedPromise(
    async (path: string) => {
      return loadDirectoryContents(path);
    },
    [directoryPath],
    {
      initialData: [],
    },
  );

  async function onSelectionChange(itemId: string | null) {
    setPreviewContent(null);
    setSelectedFile(null);

    if (!itemId) {
      return;
    }

    const fileInfo = directoryContents.find((file) => file.commandline === itemId);
    if (fileInfo) {
      setSelectedFile(fileInfo);

      if (!fileInfo.isDirectory) {
        const canPreview = await isFilePreviewable(itemId, fileInfo.size);
        if (canPreview) {
          try {
            const content = await readFile(itemId, "utf-8");
            setPreviewContent(content);
          } catch (error) {
            console.error("Error reading file for preview:", error);
          }
        }
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={`Browse: ${basename(directoryPath)}`}
      onSelectionChange={onSelectionChange}
    >
      <List.EmptyView
        title="Empty Directory"
        description={`No contents found in ${directoryPath}`}
        icon={Icon.Folder}
      />
      {directoryContents.map((item, index) => (
        <List.Item
          key={`${item.commandline}-${index}`}
          id={item.commandline}
          title={item.name}
          subtitle={isShowingDetail ? dirname(item.commandline) : undefined}
          icon={{ fileIcon: item.commandline }}
          accessories={[
            {
              text: item.isDirectory ? "Folder" : formatBytes(item.size || 0),
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {openFolderAsDefault ? (
                  <>
                    <Action
                      title="Show in Explorer"
                      icon={Icon.Folder}
                      onAction={() => showInExplorer(item.commandline, preferences)}
                    />
                    {!item.isDirectory && (
                      <Action title="Open" icon={Icon.Document} onAction={() => openFileFound(item)} />
                    )}
                    {item.commandline.toLowerCase().endsWith(".exe") && (
                      <Action
                        title="Run as Administrator"
                        icon={Icon.Shield}
                        onAction={() => runAsAdministrator(item.commandline)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {!item.isDirectory && (
                      <Action title="Open" icon={Icon.Document} onAction={() => openFileFound(item)} />
                    )}
                    <Action
                      title="Show in Explorer"
                      icon={Icon.Folder}
                      onAction={() => showInExplorer(item.commandline, preferences)}
                    />
                    {item.commandline.toLowerCase().endsWith(".exe") && (
                      <Action
                        title="Run as Administrator"
                        icon={Icon.Shield}
                        onAction={() => runAsAdministrator(item.commandline)}
                      />
                    )}
                  </>
                )}
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "i" },
                    windows: { modifiers: ["ctrl", "shift"], key: "i" },
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Copy File"
                  icon={Icon.Clipboard}
                  onAction={() => copyFileWithApi(item)}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={item.name}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "c" },
                    windows: { modifiers: ["ctrl"], key: "c" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={item.commandline}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {item.isDirectory ? (
                  <>
                    {dirname(directoryPath) !== directoryPath && (
                      <Action.Push
                        title="Navigate Up"
                        icon={Icon.ArrowUp}
                        target={<DirectoryBrowser directoryPath={dirname(directoryPath)} preferences={preferences} />}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
                          windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
                        }}
                      />
                    )}
                    <Action.Push
                      title="Navigate Down"
                      icon={Icon.ArrowDown}
                      target={<DirectoryBrowser directoryPath={item.commandline} preferences={preferences} />}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
                        windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
                      }}
                    />
                  </>
                ) : (
                  dirname(directoryPath) !== directoryPath && (
                    <Action
                      title="Navigate Up"
                      icon={Icon.ArrowUp}
                      onAction={() => pop()}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
                        windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
                      }}
                    />
                  )
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            isShowingDetail && (
              <List.Item.Detail
                markdown={previewContent ?? undefined}
                metadata={
                  selectedFile && (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
                      <List.Item.Detail.Metadata.Label title="Where" text={item.commandline} />
                      <List.Item.Detail.Metadata.Separator />
                      {selectedFile.size !== undefined && (
                        <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(selectedFile.size)} />
                      )}
                      {selectedFile.size !== undefined && <List.Item.Detail.Metadata.Separator />}
                      {selectedFile.dateCreated && (
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={selectedFile.dateCreated.toLocaleString()}
                        />
                      )}
                      {selectedFile.dateModified && (
                        <List.Item.Detail.Metadata.Label
                          title="Modified"
                          text={selectedFile.dateModified.toLocaleString()}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            )
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    const loadPrefs = () => {
      const prefs = getPreferenceValues<Preferences>();
      setPreferences(prefs);
    };
    loadPrefs();
  }, []);

  const minChars = parseInt(preferences?.minCharsToSearch || "3", 10);
  const openFolderAsDefault = preferences?.openFolderAsDefault;

  const { data: searchResults, isLoading } = useCachedPromise(
    (text: string, prefs: Preferences | null) => {
      if (!prefs || text.length < minChars) {
        return Promise.resolve([]);
      }
      return loadFilesList(text, prefs);
    },
    [searchText, preferences],
    {
      initialData: [],
    },
  );

  async function onSelectionChange(itemId: string | null) {
    setPreviewContent(null);
    setSelectedFile(null);

    if (!itemId) {
      return;
    }

    // Find the selected file from search results
    const fileInfo = searchResults.find((file) => file.commandline === itemId);
    if (fileInfo) {
      setSelectedFile(fileInfo);

      // Try to load preview for previewable files (only for non-directories)
      if (!fileInfo.isDirectory) {
        const canPreview = await isFilePreviewable(itemId, fileInfo.size);
        if (canPreview) {
          try {
            const content = await readFile(itemId, "utf-8");
            setPreviewContent(content);
          } catch (error) {
            console.error("Error reading file for preview:", error);
          }
        }
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search Files with Everything..."
      onSearchTextChange={setSearchText}
      onSelectionChange={onSelectionChange}
      throttle
    >
      <List.EmptyView
        title={
          searchText.length > 0 && searchText.length < minChars
            ? "Keep typing..."
            : searchText
              ? "No Files Found"
              : "Search for Anything"
        }
        description={
          searchText.length > 0 && searchText.length < minChars
            ? `The search will start after you type at least ${minChars} characters.`
            : searchText
              ? `No results for "${searchText}"`
              : "Start typing to search your entire system with Everything."
        }
        icon={Icon.MagnifyingGlass}
      />
      {searchResults.map((file, index) => (
        <List.Item
          key={`${file.commandline}-${index}`}
          id={file.commandline}
          title={file.name}
          subtitle={isShowingDetail ? basename(dirname(file.commandline)) : truncatePath(dirname(file.commandline))}
          icon={{ fileIcon: file.commandline }}
          accessories={[
            {
              text: file.isDirectory ? "Folder" : formatBytes(file.size || 0),
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {openFolderAsDefault ? (
                  <>
                    <Action
                      title="Show in Explorer"
                      icon={Icon.Folder}
                      onAction={() => preferences && showInExplorer(file.commandline, preferences)}
                    />
                    {file.isDirectory ? (
                      <Action title="Open" icon={Icon.Document} onAction={() => open(file.commandline)} />
                    ) : (
                      <Action title="Open" icon={Icon.Document} onAction={() => openFileFound(file)} />
                    )}
                    {file.commandline.toLowerCase().endsWith(".exe") && (
                      <Action
                        title="Run as Administrator"
                        icon={Icon.Shield}
                        onAction={() => runAsAdministrator(file.commandline)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {file.isDirectory ? (
                      <Action title="Open" icon={Icon.Document} onAction={() => open(file.commandline)} />
                    ) : (
                      <Action title="Open" icon={Icon.Document} onAction={() => openFileFound(file)} />
                    )}
                    <Action
                      title="Show in Explorer"
                      icon={Icon.Folder}
                      onAction={() => preferences && showInExplorer(file.commandline, preferences)}
                    />
                    {file.commandline.toLowerCase().endsWith(".exe") && (
                      <Action
                        title="Run as Administrator"
                        icon={Icon.Shield}
                        onAction={() => runAsAdministrator(file.commandline)}
                      />
                    )}
                  </>
                )}
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "i" },
                    windows: { modifiers: ["ctrl", "shift"], key: "i" },
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Copy File"
                  icon={Icon.Clipboard}
                  onAction={() => copyFileWithApi(file)}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={file.name}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "c" },
                    windows: { modifiers: ["ctrl"], key: "c" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={file.commandline}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {file.isDirectory && preferences ? (
                  <>
                    {dirname(file.commandline) !== file.commandline && (
                      <Action.Push
                        title="Navigate Up"
                        icon={Icon.ArrowUp}
                        target={
                          <DirectoryBrowser directoryPath={dirname(file.commandline)} preferences={preferences} />
                        }
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
                          windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
                        }}
                      />
                    )}
                    <Action.Push
                      title="Navigate Down"
                      icon={Icon.ArrowDown}
                      target={<DirectoryBrowser directoryPath={file.commandline} preferences={preferences} />}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
                        windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
                      }}
                    />
                  </>
                ) : null}
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            isShowingDetail && (
              <List.Item.Detail
                markdown={previewContent ?? undefined}
                metadata={
                  selectedFile && (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={file.name} />
                      <List.Item.Detail.Metadata.Label title="Where" text={file.commandline} />
                      <List.Item.Detail.Metadata.Separator />
                      {selectedFile.size !== undefined && (
                        <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(selectedFile.size)} />
                      )}
                      {selectedFile.size !== undefined && <List.Item.Detail.Metadata.Separator />}
                      {selectedFile.dateCreated && (
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={selectedFile.dateCreated.toLocaleString()}
                        />
                      )}
                      {selectedFile.dateModified && (
                        <List.Item.Detail.Metadata.Label
                          title="Modified"
                          text={selectedFile.dateModified.toLocaleString()}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            )
          }
        />
      ))}
    </List>
  );
}
