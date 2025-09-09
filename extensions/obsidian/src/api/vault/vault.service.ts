import { getPreferenceValues, Icon } from "@raycast/api";
import * as fs from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { performance } from "perf_hooks";
import { AUDIO_FILE_EXTENSIONS, LATEX_INLINE_REGEX, LATEX_REGEX, VIDEO_FILE_EXTENSIONS } from "../../utils/constants";
import { Media } from "../../utils/interfaces";
import { GlobalPreferences, SearchNotePreferences } from "../../utils/preferences";
import { tagsForString } from "../../utils/yaml";
import { getBookmarkedNotePaths } from "./notes/bookmarks/bookmarks.service";
import { Note } from "./notes/notes.types";
import { ObsidianJSON, Vault } from "./vault.types";

function getVaultNameFromPath(vaultPath: string): string {
  const name = path.basename(vaultPath);
  if (name) {
    return name;
  } else {
    return "Default Vault Name (check your path preferences)";
  }
}

export function parseVaults(): Vault[] {
  const pref: GlobalPreferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .filter((vaultPath) => vaultPath.trim() !== "")
    .filter((vaultPath) => fs.existsSync(vaultPath))
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }));
}

export async function loadObsidianJson(): Promise<Vault[]> {
  const obsidianJsonPath = path.resolve(
    path.join(homedir(), "Library", "Application Support", "obsidian", "obsidian.json")
  );
  try {
    const obsidianJson = JSON.parse(await readFile(obsidianJsonPath, "utf8")) as ObsidianJSON;
    return Object.values(obsidianJson.vaults).map(({ path }) => ({
      name: getVaultNameFromPath(path),
      key: path,
      path,
    }));
  } catch (e) {
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
    return normalizedPath === normalizedExcluded || normalizedPath.startsWith(normalizedExcluded + path.sep);
  });
}

const DEFAULT_EXCLUDED_PATHS = [".git", ".obsidian", ".trash", ".excalidraw", ".mobile"];

function walkFilesHelper(pathToWalk: string, excludedFolders: string[], fileEndings: string[], resultFiles: string[]) {
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
  const appJSONPath = path.join(vault.path, configFileName || ".obsidian", "app.json");
  if (!fs.existsSync(appJSONPath)) {
    return [];
  } else {
    const appJSON = JSON.parse(fs.readFileSync(appJSONPath, "utf-8"));
    return appJSON["userIgnoreFilters"] || [];
  }
}

export function filterContent(content: string) {
  const pref: GlobalPreferences = getPreferenceValues();

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
    content = content.replaceAll("![[", "");
    content = content.replaceAll("[[", "");
    content = content.replaceAll("]]", "");
  }
  return content;
}

export function getNoteFileContent(path: string, filter = false) {
  let content = "";
  content = fs.readFileSync(path, "utf8") as string;
  return filter ? filterContent(content) : content;
}

/** Reads a list of notes from the vault path */
export function loadNotes(vault: Vault): Note[] {
  console.log("Loading Notes for vault: " + vault.path);
  const start = performance.now();

  const notes: Note[] = [];
  const filePaths = getFilePaths(vault);
  const bookmarkedFilePaths = getBookmarkedNotePaths(vault);

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const title = fileName.replace(/\.md$/, "") || "default";
    const content = getNoteFileContent(filePath, false);
    const relativePath = path.relative(vault.path, filePath);

    const note: Note = {
      title,
      path: filePath,
      lastModified: fs.statSync(filePath).mtime,
      tags: tagsForString(content),
      content,
      bookmarked: bookmarkedFilePaths.includes(relativePath),
    };

    notes.push(note);
  }

  const end = performance.now();
  console.log(`Finished loading ${notes.length} notes in ${end - start} ms.`);

  return notes.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

/** Gets a list of file paths for all media. */
function getMediaFilePaths(vault: Vault) {
  const excludedFolders = getExcludedFolders();
  const files = walkFilesHelper(
    vault.path,
    excludedFolders,
    [...AUDIO_FILE_EXTENSIONS, ...VIDEO_FILE_EXTENSIONS, ".jpg", ".png", ".gif", ".mp4", ".pdf"],
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
