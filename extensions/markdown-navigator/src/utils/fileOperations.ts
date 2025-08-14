import { showToast, Toast, getPreferenceValues, trash as raycastTrash } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { MarkdownFile } from "../types/markdownTypes";
import { extractTags } from "./tagOperations";
import { markdownDir } from "../markdown-navigator";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const execAsync = promisify(exec);
const CACHE_KEY = "markdownFilesCache";
const CACHE_EXPIRY = 3600000; // one hour

// Get preferences for default editor
interface Preferences {
  markdownDir: string;
  defaultEditor: string;
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

// Get the Markdown file with optional limit
export async function getMarkdownFiles(limit?: number): Promise<MarkdownFile[]> {
  try {
    if (!markdownDir || !fs.existsSync(markdownDir)) {
      throw new Error("Markdown directory is not set or invalid");
    }

    const cached = await LocalStorage.getItem<string>(CACHE_KEY);
    const now = Date.now();

    if (cached && !limit) {
      const { files, timestamp } = JSON.parse(cached);
      if (now - timestamp < CACHE_EXPIRY) {
        console.log("Using cached files");
        return files;
      }
    }

    // Use the mdfind command to search within markdownDir
    const { stdout } = await execAsync(
      `mdfind -onlyin "${markdownDir}" "kind:markdown" | grep -v "/Library/Application Support/Code/User/History/" | grep -v "node_modules"`,
    );

    let filePaths = stdout.split("\n").filter(Boolean);
    console.log(`Found ${filePaths.length} Markdown files using mdfind in ${markdownDir}`);

    if (limit && filePaths.length > limit) {
      filePaths = filePaths.slice(0, limit);
      console.log(`Limited to ${limit} files`);
    }

    const files: MarkdownFile[] = [];

    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const dirname = path.dirname(filePath);
          const folder = path.relative(markdownDir, dirname) || path.basename(dirname);

          files.push({
            path: filePath,
            name: path.basename(filePath),
            lastModified: stats.mtime.getTime(),
            folder: folder,
            tags: extractTags(filePath),
            size: stats.size,
          });
          console.log(`Processed file: ${filePath}, folder: ${folder}`);
        } else {
          console.warn(`File not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    // Sort by last modified time, with the latest one first
    const sortedFiles = files.sort((a, b) => b.lastModified - a.lastModified);
    if (!limit) {
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ files: sortedFiles, timestamp: now }));
    }
    return sortedFiles;
  } catch (error) {
    console.error("Error while searching for Markdown files with mdfind:", error);

    // Fallback to find command
    try {
      console.log("Falling back to find command");
      const { stdout } = await execAsync(
        `find "${markdownDir}" -name "*.md" -type f -not -path "*/\\.*" -not -path "*/node_modules/*" -not -path "*/Library/*"`,
      );

      let filePaths = stdout.split("\n").filter(Boolean);
      console.log(`Found ${filePaths.length} Markdown files using find in ${markdownDir}`);

      if (limit && filePaths.length > limit) {
        filePaths = filePaths.slice(0, limit);
        console.log(`Limited to ${limit} files`);
      }

      const files = filePaths.map((filePath) => {
        const stats = fs.statSync(filePath);
        const dirname = path.dirname(filePath);
        const folder = path.relative(markdownDir, dirname) || path.basename(dirname);

        return {
          path: filePath,
          name: path.basename(filePath),
          lastModified: stats.mtime.getTime(),
          folder: folder,
          tags: extractTags(filePath),
          size: stats.size,
        };
      });

      const sortedFiles = files.sort((a, b) => b.lastModified - a.lastModified);
      if (!limit) {
        const now = Date.now();
        await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ files: sortedFiles, timestamp: now }));
      }
      return sortedFiles;
    } catch (fallbackError) {
      console.error("Alternative method also failed:", fallbackError);
      showFailureToast({
        title: "Failed to load Markdown files",
        message: "Both mdfind and find commands failed. Check console for details.",
      });
      return [];
    }
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
