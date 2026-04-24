import {
  Action,
  ActionPanel,
  Cache,
  confirmAlert,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { accessSync, constants, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { rm } from "fs/promises";
import { join } from "path";
import { execFile, execSync } from "child_process";
import { homedir, tmpdir } from "os";
import { ComponentType } from "react";
import untildify from "untildify";

const cache = new Cache();
const CACHE_KEY = "customDownloadsFolder";

const preferences = getPreferenceValues();

export type Download = {
  file: string;
  path: string;
  size: number;
  isDirectory: boolean;
  itemCount?: number;
  lastModifiedAt: Date;
  createdAt: Date;
  addedAt: Date;
  birthAt: Date;
};

function getCachedOrDetectDownloadsFolder(): string {
  // If preference is set, use it
  if (preferences.downloadsFolder && preferences.downloadsFolder.trim()) {
    return untildify(preferences.downloadsFolder);
  }

  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached && typeof cached === "string") {
    return cached;
  }

  // Detect and cache the folder
  const detected = getCustomDownloadsFolder();
  cache.set(CACHE_KEY, detected);
  return detected;
}

export const downloadsFolder = getCachedOrDetectDownloadsFolder();
const showHiddenFiles = preferences.showHiddenFiles;
const fileOrder = preferences.fileOrder;
const latestDownloadOrder = preferences.lastestDownloadOrder;
export const defaultDownloadsLayout = preferences.downloadsLayout ?? "list";
export const showPreview = preferences.showPreview ?? true;
const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".heic", ".svg"];

export function getCustomDownloadsFolder(): string {
  // macOS
  if (process.platform === "darwin") {
    return untildify("~/Downloads");
  } else if (process.platform === "win32") {
    // Query Windows registry for the actual Downloads folder location
    try {
      const result = execSync(
        `powershell -Command "(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path"`,
        { encoding: "utf-8" },
      );
      return result.trim();
    } catch (error) {
      // Fallback to default location if registry query fails
      console.error("Failed to get Downloads folder from registry:", error);
      return join(homedir(), "Downloads");
    }
  }
  // Fallback for other platforms
  return untildify("~/Downloads");
}

export function isImageFile(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.toLowerCase().slice(dotIndex);
  return imageExtensions.includes(ext);
}

function countDirectoryItems(dirPath: string): number {
  try {
    const items = readdirSync(dirPath);
    return items.filter((name) => showHiddenFiles || !name.startsWith(".")).length;
  } catch (error) {
    console.warn(`Error counting items in directory '${dirPath}':`, error);
    return 0;
  }
}

export function getDownloadsCount(): number {
  const files = readdirSync(downloadsFolder);
  return files.filter((file) => showHiddenFiles || !file.startsWith(".")).length;
}

export function getDownloads(limit?: number, offset: number = 0, currentFolderPath: string | null = null) {
  const files = readdirSync(currentFolderPath ?? downloadsFolder);
  const filteredFiles = files.filter((file) => showHiddenFiles || !file.startsWith("."));

  const allDownloads = filteredFiles
    .map((file) => {
      const path = join(currentFolderPath ?? downloadsFolder, file);
      try {
        const stats = statSync(path);
        const isDirectory = stats.isDirectory();
        const size = isDirectory ? 0 : stats.size;
        const itemCount = isDirectory ? countDirectoryItems(path) : undefined;
        return {
          file,
          path,
          size,
          isDirectory,
          itemCount,
          lastModifiedAt: stats.mtime,
          createdAt: stats.ctime,
          addedAt: stats.atime,
          birthAt: stats.birthtime,
        };
      } catch (error) {
        // Skip entries we can't stat (broken symlinks, removed targets, permission issues)
        console.warn(`Skipping '${path}' because it could not be stat'd:`, error);
        return undefined;
      }
    })
    .filter((entry) => Boolean(entry))
    .map((entry) => entry as Exclude<typeof entry, undefined>)
    .sort((a, b) => {
      switch (fileOrder) {
        case "addTime":
          return b.addedAt.getTime() - a.addedAt.getTime();
        case "createTime":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "modifiedTime":
        default:
          return b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime();
      }
    });

  if (limit !== undefined) {
    return allDownloads.slice(offset, offset + limit);
  }
  return allDownloads;
}

export function getLatestDownload() {
  const downloads = getDownloads();
  if (downloads.length < 1) {
    return undefined;
  }

  if (latestDownloadOrder === "addTime") {
    downloads.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  } else if (latestDownloadOrder === "createTime") {
    downloads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (latestDownloadOrder === "modifiedTime") {
    downloads.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  } else if (latestDownloadOrder === "birthTime") {
    downloads.sort((a, b) => b.birthAt.getTime() - a.birthAt.getTime());
  }

  return downloads[0];
}

export function hasAccessToDownloadsFolder() {
  try {
    accessSync(downloadsFolder, constants.R_OK);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function deleteFileOrFolder(filePath: string) {
  if (preferences.deletionBehavior === "trash") {
    try {
      await trash(filePath);
      await showToast({ style: Toast.Style.Success, title: "Item Moved to Trash" });
    } catch (error) {
      await showFailureToast(error, { title: "Move to Trash Failed" });
    }
    return;
  }

  const shouldDelete = await confirmAlert({
    title: "Delete Item?",
    message: `Are you sure you want to permanently delete:\n${filePath}?`,
    primaryAction: {
      title: "Delete",
    },
  });

  if (!shouldDelete) {
    await showToast({ style: Toast.Style.Animated, title: "Cancelled" });
    return;
  }

  try {
    await rm(filePath, { recursive: true, force: true });
    await showToast({ style: Toast.Style.Success, title: "Item Deleted" });
  } catch (error) {
    if (error instanceof Error) {
      await showFailureToast(error, { title: "Deletion Failed" });
    }
  }
}

export const withAccessToDownloadsFolder = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    if (hasAccessToDownloadsFolder()) {
      return <Component {...props} />;
    } else {
      if (process.platform === "darwin") {
        const markdown = `## Permission Required\n\nThe Downloads Manager extension requires access to your Downloads folder. Please grant permission to use it.\n\n![Grant Permission](permission.png)`;
        return (
          <Detail
            markdown={markdown}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Grant Permission"
                  target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
                />
              </ActionPanel>
            }
          />
        );
      } else {
        // Windows: Usually a path issue, not a permission issue
        const markdown = `## Cannot Access Downloads Folder\n\nUnable to access the Downloads folder at:\n\`${downloadsFolder}\`\n\nPlease check that the folder exists and the path is correct.`;
        return (
          <Detail
            markdown={markdown}
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={downloadsFolder} />
              </ActionPanel>
            }
          />
        );
      }
    }
  };
};

const textExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".jsonc",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".xml",
  ".csv",
  ".tsv",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".env",
  ".cfg",
  ".conf",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".java",
  ".kt",
  ".swift",
  ".php",
  ".cs",
  ".sql",
  ".graphql",
  ".gql",
  ".log",
]);

const extToLanguage: Record<string, string> = {
  json: "json",
  jsonc: "json",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  md: "markdown",
  markdown: "markdown",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
  html: "html",
  htm: "html",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  php: "php",
  cs: "csharp",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
};

const TEXT_PREVIEW_MAX_BYTES = 10_000;

export function isTextFile(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.toLowerCase().slice(dotIndex);
  return textExtensions.has(ext);
}

export function getTextFilePreview(filePath: string): string {
  try {
    const buffer = readFileSync(filePath);
    const truncated = buffer.length > TEXT_PREVIEW_MAX_BYTES;
    const text = buffer.slice(0, TEXT_PREVIEW_MAX_BYTES).toString("utf-8");
    const dotIndex = filePath.lastIndexOf(".");
    const ext = dotIndex !== -1 ? filePath.slice(dotIndex + 1).toLowerCase() : "";
    const lang = extToLanguage[ext] ?? "";
    return `\`\`\`${lang}\n${text}${truncated ? "\n\u2026" : ""}\n\`\`\``;
  } catch {
    return "*Cannot read file content*";
  }
}

const PREVIEW_THUMBNAIL_SIZE = 512;

export function getQuickLookPreviewDataUrl(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") {
      resolve(null);
      return;
    }

    const TIMEOUT_MS = 1000;

    let tempDir: string | null = null;
    let resolved = false;

    const resolveOnce = (value: string | null) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    const cleanup = () => {
      if (tempDir) {
        try {
          rmSync(tempDir, { recursive: true });
        } catch {
          // ignore cleanup errors
        }
      }
    };

    const timeoutId = setTimeout(() => {
      console.warn(`Quick Look preview timed out for '${filePath}'`);
      cleanup();
      resolveOnce(null);
    }, TIMEOUT_MS);

    try {
      tempDir = mkdtempSync(join(tmpdir(), "raycast-ql-preview-"));
      execFile(
        "qlmanage",
        ["-t", "-s", String(PREVIEW_THUMBNAIL_SIZE), "-o", tempDir, filePath],
        (error, _stdout, stderr) => {
          try {
            if (error || stderr) {
              resolveOnce(null);
              return;
            }

            const files = readdirSync(tempDir!);
            const png = files.find((f) => f.endsWith(".png"));

            if (!png) {
              resolveOnce(null);
              return;
            }

            const buffer = readFileSync(join(tempDir!, png));
            resolveOnce(`data:image/png;base64,${buffer.toString("base64")}`);
          } catch (err) {
            console.warn(`Error generating Quick Look preview for '${filePath}':`, err);
            resolveOnce(null);
          } finally {
            clearTimeout(timeoutId);
            cleanup();
          }
        },
      );
    } catch (err) {
      console.warn(`Error starting Quick Look for '${filePath}':`, err);
      clearTimeout(timeoutId);
      cleanup();
      resolveOnce(null);
    }
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot + 1).toUpperCase();
}

export function getFileType(download: Download): string {
  if (download.isDirectory) {
    return "Folder";
  }
  const extension = getFileExtension(download.file);
  return extension || "File";
}
