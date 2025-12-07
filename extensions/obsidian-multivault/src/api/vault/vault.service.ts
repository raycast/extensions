import { getPreferenceValues, Icon } from "@raycast/api";
import * as fs from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { performance } from "perf_hooks";
import {
  AUDIO_FILE_EXTENSIONS,
  LATEX_INLINE_REGEX,
  LATEX_REGEX,
  OBSIDIAN_IMAGE_EMBED_REGEX,
  VIDEO_FILE_EXTENSIONS,
} from "../../utils/constants";
import { Media } from "../../utils/interfaces";
import {
  GlobalPreferences,
  SearchNotePreferences,
} from "../../utils/preferences";
import { tagsForString } from "../../utils/yaml";
import { Logger } from "../logger/logger.service";
import { getBookmarkedNotePaths } from "./notes/bookmarks/bookmarks.service";
import { Note } from "./notes/notes.types";
import { ObsidianJSON, Vault } from "./vault.types";

const logger = new Logger("VaultService");

function getVaultNameFromPath(vaultPath: string): string {
  const name = path.basename(vaultPath);
  if (name) {
    return name;
  } else {
    return "Default Vault Name (check your path preferences)";
  }
}

/**
 * Cleans a vault path by removing quotes and extra whitespace.
 * Handles various user input formats like:
 * - "C:\path\to\vault"
 * - 'C:\path\to\vault'
 * - C:\path\to\vault
 */
function cleanVaultPath(vaultPath: string): string {
  return vaultPath
    .trim()
    .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
    .trim();
}

/**
 * Parses the vault path preference string into an array of Vault objects.
 * Supports multiple formats:
 * - Comma-separated: path1,path2,path3
 * - Quoted paths: "path1","path2" or 'path1','path2'
 * - Mixed: "path with spaces",path-no-spaces
 * - Semicolon-separated (Windows style): path1;path2
 */
export function parseVaults(): Vault[] {
  const pref: GlobalPreferences = getPreferenceValues();
  const vaultString = pref.vaultPath;

  if (!vaultString || vaultString.trim() === "") {
    return [];
  }

  // Split by comma, but be smart about quoted paths
  // This regex splits on commas that are not inside quotes
  const paths: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < vaultString.length; i++) {
    const char = vaultString[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      current += char;
    } else if (char === "," && !inQuotes) {
      if (current.trim()) {
        paths.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }

  // Don't forget the last path
  if (current.trim()) {
    paths.push(current);
  }

  return paths
    .map(cleanVaultPath)
    .filter((vaultPath) => vaultPath !== "")
    .filter((vaultPath) => fs.existsSync(vaultPath))
    .map((vaultPath) => ({
      name: getVaultNameFromPath(vaultPath),
      key: vaultPath,
      path: vaultPath,
    }));
}

/**
 * Gets the path to Obsidian's config file based on the current platform.
 * - macOS: ~/Library/Application Support/obsidian/obsidian.json
 * - Windows: %APPDATA%/obsidian/obsidian.json
 * - Linux: ~/.config/obsidian/obsidian.json
 */
function getObsidianConfigPath(): string {
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS
    return path.join(
      homedir(),
      "Library",
      "Application Support",
      "obsidian",
      "obsidian.json"
    );
  } else if (platform === "win32") {
    // Windows - use APPDATA environment variable
    const appData =
      process.env.APPDATA || path.join(homedir(), "AppData", "Roaming");
    return path.join(appData, "obsidian", "obsidian.json");
  } else {
    // Linux and others
    return path.join(homedir(), ".config", "obsidian", "obsidian.json");
  }
}

export async function loadObsidianJson(): Promise<Vault[]> {
  const obsidianJsonPath = path.resolve(getObsidianConfigPath());
  try {
    const obsidianJson = JSON.parse(
      await readFile(obsidianJsonPath, "utf8")
    ) as ObsidianJSON;
    return Object.values(obsidianJson.vaults).map(({ path: vaultPath }) => ({
      name: getVaultNameFromPath(vaultPath),
      key: vaultPath,
      path: vaultPath,
    }));
  } catch (e) {
    logger.warning(`Could not load obsidian.json from ${obsidianJsonPath}: ${e}`);
    return [];
  }
}

/**
 * Checks if a path should be excluded based on exclusion rules
 */
function isPathExcluded(pathToCheck: string, excludedPaths: string[]) {
  const normalizedPath = path.normalize(pathToCheck);

  return excludedPaths.some((excluded) => {
    if (!excluded) return false;

    const normalizedExcluded = path.normalize(excluded);

    // Check if the path is exactly the excluded path or is a subfolder
    return (
      normalizedPath === normalizedExcluded ||
      normalizedPath.startsWith(normalizedExcluded + path.sep)
    );
  });
}

const DEFAULT_EXCLUDED_PATHS = [
  ".git",
  ".obsidian",
  ".trash",
  ".excalidraw",
  ".mobile",
];

function walkFilesHelper(
  pathToWalk: string,
  excludedFolders: string[],
  fileEndings: string[],
  resultFiles: string[]
) {
  const files = fs.readdirSync(pathToWalk);
  const { configFileName } = getPreferenceValues();

  for (const file of files) {
    const fullPath = path.join(pathToWalk, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (file === configFileName) continue;
      if (DEFAULT_EXCLUDED_PATHS.includes(file)) continue;
      if (isPathExcluded(fullPath, excludedFolders)) continue;
      // Recursively process subdirectory
      walkFilesHelper(fullPath, excludedFolders, fileEndings, resultFiles);
    } else {
      const extension = path.extname(file);
      if (
        fileEndings.includes(extension) &&
        file !== ".md" &&
        !file.includes(".excalidraw") &&
        !isPathExcluded(pathToWalk, [".obsidian", configFileName]) &&
        !isPathExcluded(pathToWalk, excludedFolders)
      ) {
        resultFiles.push(fullPath);
      }
    }
  }

  return resultFiles;
}

/** Gets a list of folders that are marked as excluded inside of the Raycast preferences */
function getExcludedFolders(): string[] {
  const preferences = getPreferenceValues<SearchNotePreferences>();
  const foldersString = preferences.excludedFolders;
  if (!foldersString) return [];

  const folders = foldersString.split(",").map((folder) => folder.trim());
  return folders;
}

/** Returns a list of file paths for all notes. */
function getFilePaths(vault: Vault): string[] {
  const excludedFolders = getExcludedFolders();
  const userIgnoredFolders = getUserIgnoreFilters(vault);
  excludedFolders.push(...userIgnoredFolders);
  const files = walkFilesHelper(vault.path, excludedFolders, [".md"], []);
  return files;
}

/** Gets a list of folders that are ignored by the user inside of Obsidian */
function getUserIgnoreFilters(vault: Vault): string[] {
  const { configFileName } = getPreferenceValues<GlobalPreferences>();
  const appJSONPath = path.join(
    vault.path,
    configFileName || ".obsidian",
    "app.json"
  );
  if (!fs.existsSync(appJSONPath)) {
    return [];
  } else {
    const appJSON = JSON.parse(fs.readFileSync(appJSONPath, "utf-8"));
    return appJSON["userIgnoreFilters"] || [];
  }
}

/**
 * Gets Obsidian's attachment folder path setting from app.json
 * Returns the configured path or empty string if using vault root
 */
function getAttachmentFolderPath(vault: Vault): string {
  const { configFileName } = getPreferenceValues<GlobalPreferences>();
  const appJSONPath = path.join(
    vault.path,
    configFileName || ".obsidian",
    "app.json"
  );
  if (!fs.existsSync(appJSONPath)) {
    return "";
  }
  try {
    const appJSON = JSON.parse(fs.readFileSync(appJSONPath, "utf-8"));
    return appJSON["attachmentFolderPath"] || "";
  } catch {
    return "";
  }
}

/**
 * Checks if a file path is within a vault directory (prevents path traversal attacks)
 */
function isPathWithinVault(filePath: string, vaultPath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedVault = path.resolve(vaultPath);
  return (
    resolvedPath.startsWith(resolvedVault + path.sep) ||
    resolvedPath === resolvedVault
  );
}

/**
 * Resolves an Obsidian image filename to its absolute path.
 * Searches in:
 * 1. The configured attachment folder
 * 2. The vault root
 * 3. Recursively through the vault (for images in subfolders)
 */
function resolveImagePath(
  imageName: string,
  vault: Vault,
  notePath?: string
): string | null {
  // Sanitize the image name to prevent path traversal
  const sanitizedImageName = imageName.replace(/\.\.[/\\]/g, "");

  // If imageName already has a path (contains / or \), try that first
  if (sanitizedImageName.includes("/") || sanitizedImageName.includes("\\")) {
    const directPath = path.join(vault.path, sanitizedImageName);
    if (
      fs.existsSync(directPath) &&
      isPathWithinVault(directPath, vault.path)
    ) {
      return directPath;
    }
  }

  // Try the attachment folder first
  const attachmentFolder = getAttachmentFolderPath(vault);
  if (attachmentFolder) {
    // Handle Obsidian's special "./" prefix meaning same folder as note
    if (attachmentFolder === "./" && notePath) {
      const noteDir = path.dirname(notePath);
      const sameFolderPath = path.join(noteDir, sanitizedImageName);
      if (
        fs.existsSync(sameFolderPath) &&
        isPathWithinVault(sameFolderPath, vault.path)
      ) {
        return sameFolderPath;
      }
    } else {
      const attachmentPath = path.join(
        vault.path,
        attachmentFolder,
        sanitizedImageName
      );
      if (
        fs.existsSync(attachmentPath) &&
        isPathWithinVault(attachmentPath, vault.path)
      ) {
        return attachmentPath;
      }
    }
  }

  // Try vault root
  const rootPath = path.join(vault.path, sanitizedImageName);
  if (fs.existsSync(rootPath) && isPathWithinVault(rootPath, vault.path)) {
    return rootPath;
  }

  // Try same folder as the note
  if (notePath) {
    const noteDir = path.dirname(notePath);
    const sameFolderPath = path.join(noteDir, sanitizedImageName);
    if (
      fs.existsSync(sameFolderPath) &&
      isPathWithinVault(sameFolderPath, vault.path)
    ) {
      return sameFolderPath;
    }
  }

  // Search recursively (slower, but handles any location)
  const searchDirs = [vault.path];
  while (searchDirs.length > 0) {
    const dir = searchDirs.pop()!;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue; // Skip hidden folders
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDirs.push(fullPath);
        } else if (entry.name === sanitizedImageName) {
          return fullPath;
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  return null;
}

/**
 * NOTE: Local image rendering in Raycast markdown is not supported on Windows.
 *
 * APPROACHES TRIED (all failed to render on Windows):
 * 1. Base64 data URIs - Silently doesn't render
 * 2. ~ paths with URL encoding (~/.../file.jpg) - Doesn't work on Windows
 * 3. Absolute paths with forward slashes (C:/Users/...) - Doesn't render
 * 4. file:// URL format (file:///C:/...) - Doesn't render
 * 5. Raw absolute path with backslashes - Shows raw markdown, doesn't render
 *
 * Raycast officially only supports: asset-relative paths and https:// URLs
 * We now show placeholder text for local images instead.
 */

/**
 * Converts Obsidian image embeds (![[image.jpg]]) to placeholder text.
 * Raycast's markdown renderer doesn't support local file paths on Windows,
 * so we show a placeholder indicating the image name instead.
 */
export function convertObsidianImages(
  content: string,
  vault: Vault,
  notePath?: string
): string {
  // Reset regex state
  OBSIDIAN_IMAGE_EMBED_REGEX.lastIndex = 0;

  return content.replace(
    OBSIDIAN_IMAGE_EMBED_REGEX,
    (match, imagePath, _ext, altText) => {
      const resolvedPath = resolveImagePath(imagePath, vault, notePath);
      if (resolvedPath) {
        // Raycast's markdown renderer doesn't support local file paths on Windows
        // Show a placeholder with the image name instead
        const displayName = altText || path.basename(imagePath);
        return `\`📷 ${displayName}\``;
      }
      // If image not found, indicate that
      return `\`📷 ${imagePath} (not found)\``;
    }
  );
}

/**
 * Checks if content is an Excalidraw drawing file
 */
function isExcalidrawContent(content: string): boolean {
  return (
    content.includes("excalidraw-plugin:") ||
    content.includes("# Excalidraw Data")
  );
}

/**
 * Extracts embedded file references from Excalidraw content
 */
function getExcalidrawEmbeddedFiles(content: string): string[] {
  const embeddedFiles: string[] = [];
  const matches = content.matchAll(
    /\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|svg))\]\]/gi
  );
  for (const match of matches) {
    embeddedFiles.push(match[1]);
  }
  return embeddedFiles;
}

/**
 * Formats Excalidraw content for display - shows a friendly message and any embedded images
 */
function formatExcalidrawContent(
  content: string,
  vault?: Vault,
  notePath?: string
): string {
  let result = "# 🎨 Excalidraw Drawing\n\n";
  result +=
    "*This is an Excalidraw drawing file. Open in Obsidian to view and edit the drawing.*\n\n";

  // Try to extract and display any embedded images
  const embeddedFiles = getExcalidrawEmbeddedFiles(content);
  if (embeddedFiles.length > 0 && vault) {
    result += "## Embedded Images\n\n";
    for (const file of embeddedFiles) {
      const resolvedPath = resolveImagePath(file, vault, notePath);
      if (resolvedPath) {
        result += `- \`📷 ${file}\`\n`;
      } else {
        result += `- \`📷 ${file} (not found)\`\n`;
      }
    }
  }

  return result;
}

export function filterContent(
  content: string,
  vault?: Vault,
  notePath?: string
) {
  const pref: GlobalPreferences = getPreferenceValues();

  // Handle Excalidraw files specially
  if (isExcalidrawContent(content)) {
    return formatExcalidrawContent(content, vault, notePath);
  }

  if (pref.removeYAML) {
    const yamlHeader = content.match(/---(.|\n)*?---/gm);
    if (yamlHeader) {
      content = content.replace(yamlHeader[0], "");
    }
  }
  if (pref.removeLatex) {
    const latex = content.matchAll(LATEX_REGEX);
    for (const match of latex) {
      content = content.replace(match[0], "");
    }
    const latexInline = content.matchAll(LATEX_INLINE_REGEX);
    for (const match of latexInline) {
      content = content.replace(match[0], "");
    }
  }
  if (pref.removeLinks) {
    // First convert image embeds to standard markdown (if vault provided)
    if (vault) {
      content = convertObsidianImages(content, vault, notePath);
    }
    // Then clean up remaining wikilinks (non-images)
    content = content.replaceAll("[[", "");
    content = content.replaceAll("]]", "");
  } else if (vault) {
    // Even if not removing links, convert images so they display
    content = convertObsidianImages(content, vault, notePath);
  }
  return content;
}

export function getNoteFileContent(
  notePath: string,
  filter = false,
  vault?: Vault
) {
  let content = "";
  content = fs.readFileSync(notePath, "utf8") as string;
  return filter ? filterContent(content, vault, notePath) : content;
}

/**
 * Extracts tags from the first few lines of a file without loading the entire content.
 * This is a lightweight operation for initial note discovery.
 */
function getTagsFromFileHead(filePath: string): string[] {
  try {
    // Read only the first 2KB to extract YAML frontmatter tags
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(2048);
    const bytesRead = fs.readSync(fd, buffer, 0, 2048, 0);
    fs.closeSync(fd);

    const head = buffer.toString("utf8", 0, bytesRead);
    return tagsForString(head);
  } catch {
    return [];
  }
}

/** Reads a list of notes from the vault path (metadata only - content loaded on demand) */
export function loadNotes(vault: Vault): Note[] {
  logger.info("Loading Notes for vault: " + vault.path);
  const start = performance.now();

  const notes: Note[] = [];
  const filePaths = getFilePaths(vault);
  const bookmarkedFilePaths = getBookmarkedNotePaths(vault);

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const title = fileName.replace(/\.md$/, "") || "default";
    const relativePath = path.relative(vault.path, filePath);

    // Only load metadata initially - content is loaded on demand
    const note: Note = {
      title,
      path: filePath,
      lastModified: fs.statSync(filePath).mtime,
      tags: getTagsFromFileHead(filePath), // Lightweight tag extraction
      content: "", // Content loaded lazily via getNoteContent()
      bookmarked: bookmarkedFilePaths.includes(relativePath),
    };

    notes.push(note);
  }

  const end = performance.now();
  logger.info(`Finished loading ${notes.length} notes in ${end - start} ms.`);

  return notes.sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  );
}

/**
 * Gets the content of a note. Use this instead of accessing note.content directly
 * to ensure content is loaded.
 * Pass vault to enable image attachment resolution for display.
 */
export function getNoteContent(
  note: Note,
  filter = false,
  vault?: Vault
): string {
  if (note.content && !filter) {
    // Return cached content if not filtering
    return note.content;
  }
  if (note.content && filter) {
    // Apply filter to cached content
    return filterContent(note.content, vault, note.path);
  }
  return getNoteFileContent(note.path, filter, vault);
}

/**
 * Ensures a note has its content loaded. Mutates the note object.
 * Call this before accessing note.content directly.
 */
export function ensureNoteContent(note: Note): Note {
  if (!note.content) {
    note.content = getNoteFileContent(note.path, false);
  }
  return note;
}

/** Gets a list of file paths for all media. */
function getMediaFilePaths(vault: Vault) {
  const excludedFolders = getExcludedFolders();
  const files = walkFilesHelper(
    vault.path,
    excludedFolders,
    [
      ...AUDIO_FILE_EXTENSIONS,
      ...VIDEO_FILE_EXTENSIONS,
      ".jpg",
      ".png",
      ".gif",
      ".mp4",
      ".pdf",
    ],
    []
  );
  return files;
}

/** Loads media (images, pdfs, video, audio, etc.) for a given vault from disk. utils.useMedia() is the preferred way of loading media. */
export function loadMedia(vault: Vault): Media[] {
  const medias: Media[] = [];
  const filePaths = getMediaFilePaths(vault);

  for (const filePath of filePaths) {
    const title = path.basename(filePath);
    const icon = getIconFor(filePath);

    const media: Media = {
      title,
      path: filePath,
      icon: icon,
    };
    medias.push(media);
  }
  return medias;
}

/** Gets the icon for a given file path. This is used to determine the icon for a media item where the media itself can't be displayed (e.g. video, audio). */
function getIconFor(filePath: string) {
  const fileExtension = path.extname(filePath);
  if (VIDEO_FILE_EXTENSIONS.includes(fileExtension)) {
    return { source: Icon.Video };
  } else if (AUDIO_FILE_EXTENSIONS.includes(fileExtension)) {
    return { source: Icon.Microphone };
  }
  return { source: filePath };
}
