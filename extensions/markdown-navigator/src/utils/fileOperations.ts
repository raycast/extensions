import { showToast, Toast, getPreferenceValues, trash as raycastTrash } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { MarkdownFile } from "../types/markdownTypes";
import { extractTags } from "./tagOperations";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const execAsync = promisify(exec);
const CACHE_KEY = "markdownFilesCache";
const CACHE_VERSION = 2;
const CACHE_EXPIRY = 3600000; // one hour
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mdown", ".mkd"]);
const IGNORED_DIRECTORY_NAMES = new Set(["node_modules"]);
const VS_CODE_HISTORY_PATH_SEGMENTS = ["Library", "Application Support", "Code", "User", "History"];

// Get preferences for default editor
interface Preferences {
  markdownDir: string;
  defaultEditor: string;
}

interface MarkdownFilesCache {
  version: number;
  markdownDir: string;
  files: MarkdownFile[];
  timestamp: number;
}

// Clear the markdown files cache
export async function clearMarkdownFilesCache(): Promise<void> {
  try {
    await LocalStorage.removeItem(CACHE_KEY);
    console.log("Markdown files cache cleared");
  } catch (error) {
    console.error("Error clearing markdown files cache:", error);
  }
}

// Check if the specified editor application exists
export async function checkEditorExists(editor: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`open -Ra "${editor}"`);
    console.log(`Found editor at: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.log(`Editor ${editor} not found:`, error);
    return false;
  }
}

const isPathSameOrInside = (targetPath: string, parentPath: string): boolean => {
  const relativePath = path.relative(path.resolve(parentPath), path.resolve(targetPath));
  return relativePath === "" || (!!relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const pathEndsWithSegments = (targetPath: string, segments: string[]): boolean => {
  const targetSegments = path.resolve(targetPath).split(path.sep).filter(Boolean);
  if (targetSegments.length < segments.length) {
    return false;
  }

  return segments.every((segment, index) => {
    return targetSegments[targetSegments.length - segments.length + index] === segment;
  });
};

export const shouldIgnoreScanPath = (entryPath: string, rootDirectory: string): boolean => {
  const directoryName = path.basename(entryPath);
  if (directoryName.startsWith(".") || IGNORED_DIRECTORY_NAMES.has(directoryName)) {
    return true;
  }

  if (pathEndsWithSegments(entryPath, VS_CODE_HISTORY_PATH_SEGMENTS)) {
    return true;
  }

  const homeDirectory = homedir();
  const userLibraryPath = path.join(homeDirectory, "Library");
  return isPathSameOrInside(homeDirectory, rootDirectory) && path.resolve(entryPath) === path.resolve(userLibraryPath);
};

const isMarkdownFile = (filePath: string): boolean => {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase());
};

async function scanMarkdownFilePathsInDirectory(directory: string, rootDirectory: string): Promise<string[]> {
  const filePaths: string[] = [];
  let entries: fs.Dirent[];

  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch (error) {
    console.warn(`Unable to scan directory ${directory}:`, error);
    return filePaths;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en-US"))) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnoreScanPath(entryPath, rootDirectory)) {
        filePaths.push(...(await scanMarkdownFilePathsInDirectory(entryPath, rootDirectory)));
      }
      continue;
    }

    if (entry.isFile() && isMarkdownFile(entryPath)) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

export function scanMarkdownFilePaths(directory: string): Promise<string[]> {
  const rootDirectory = path.resolve(directory);
  return scanMarkdownFilePathsInDirectory(rootDirectory, rootDirectory);
}

async function toMarkdownFileOrNull(filePath: string, rootDirectory: string): Promise<MarkdownFile | null> {
  try {
    const stats = await fs.promises.stat(filePath);
    const dirname = path.dirname(filePath);
    const folder = path.relative(rootDirectory, dirname) || path.basename(dirname);

    return {
      path: filePath,
      name: path.basename(filePath),
      lastModified: stats.mtime.getTime(),
      folder: folder,
      tags: extractTags(filePath),
      size: stats.size,
    };
  } catch (error) {
    console.warn(`Skipping inaccessible Markdown file ${filePath}:`, error);
    return null;
  }
}

// Get Markdown files from the configured directory.
export async function getMarkdownFiles(): Promise<MarkdownFile[]> {
  try {
    const { markdownDir } = getPreferenceValues<Preferences>();

    if (!markdownDir || !fs.existsSync(markdownDir)) {
      throw new Error("Markdown directory is not set or invalid");
    }

    const cached = await LocalStorage.getItem<string>(CACHE_KEY);
    const now = Date.now();

    if (cached) {
      try {
        const cache = JSON.parse(cached) as Partial<MarkdownFilesCache>;
        if (
          cache.version === CACHE_VERSION &&
          cache.markdownDir === markdownDir &&
          Array.isArray(cache.files) &&
          typeof cache.timestamp === "number" &&
          now - cache.timestamp < CACHE_EXPIRY
        ) {
          console.log("Using cached files");
          return cache.files;
        }
      } catch (error) {
        console.warn("Ignoring invalid Markdown files cache:", error);
      }
    }

    const filePaths = await scanMarkdownFilePaths(markdownDir);
    console.log(`Found ${filePaths.length} Markdown files in ${markdownDir}`);

    const files: MarkdownFile[] = [];
    for (const filePath of filePaths) {
      const file = await toMarkdownFileOrNull(filePath, markdownDir);
      if (file) {
        files.push(file);
      }
    }

    // Sort by last modified time, with the latest one first
    const sortedFiles = files.sort((a, b) => b.lastModified - a.lastModified || a.path.localeCompare(b.path, "en-US"));
    await LocalStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: CACHE_VERSION, markdownDir, files: sortedFiles, timestamp: now }),
    );
    return sortedFiles;
  } catch (error) {
    console.error("Error while scanning Markdown files:", error);
    showFailureToast({
      title: "Failed to load Markdown files",
      message: error instanceof Error ? error.message : "Check console for details.",
    });
    return [];
  }
}

// Get the default editor from preferences
export function getDefaultEditor(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.defaultEditor || "Typora"; // Fallback to Typora if not set
}

// Open the file in the default editor
export async function openWithEditor(filePath: string) {
  try {
    const editor = getDefaultEditor();
    console.log(`Opening file: ${filePath} with ${editor}`);
    await execAsync(`open -a "${editor}" "${filePath}"`);

    showToast({
      style: Toast.Style.Success,
      title: `The file has been opened in ${editor}`,
    });
  } catch (error) {
    console.error(`Error opening file using ${getDefaultEditor()}:`, error);
    showFailureToast({
      title: "Unable to open file",
      message: `Make sure ${getDefaultEditor()} is installed or change your default editor in preferences.`,
    });
  }
}

// Open the file in the default editor and set the window size
export const openInEditorWithSize = (filePath: string) => {
  const editor = getDefaultEditor();

  // This AppleScript only works with Typora
  if (editor === "Typora") {
    const appleScript = `
      tell application "Typora"
        activate
        open "${filePath}"
        delay 0.5 -- wait for the window to load
        tell front window
          set bounds to {100, 100, 1400, 850} -- {left, top, width, height}
        end tell
      end tell
    `;
    exec(`osascript -e '${appleScript}'`, (error) => {
      if (error) {
        showFailureToast({
          title: "Cannot open Typora",
          message: "Please make sure Typora is installed and supports AppleScript",
        });
      }
    });
  } else {
    // For other editors, just open without window sizing
    openWithEditor(filePath);
  }
};

// Create a new Markdown file
export const createMarkdownFile = (filePath: string, content: string): boolean => {
  try {
    // Make sure the directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Check if the file already exists
    if (fs.existsSync(filePath)) {
      showFailureToast({
        title: "File already exists",
        message: `${path.basename(filePath)} already exists in the directory`,
      });
      return false;
    }

    // Write to file
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    showFailureToast({
      title: "Error creating file",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
    return false;
  }
};

// Move file to trash using Raycast's trash API
export async function moveToTrash(filePath: string): Promise<boolean> {
  try {
    await raycastTrash(filePath);
    // Clear cache after moving file to trash
    await clearMarkdownFilesCache();
    return true;
  } catch (error) {
    console.error("Error moving file to trash:", error);
    return false;
  }
}
