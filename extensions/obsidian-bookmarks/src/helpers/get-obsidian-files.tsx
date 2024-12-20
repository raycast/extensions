// getObsidianFiles.ts
import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";
import frontMatter from "front-matter";
import { File, FrontMatter, Preferences } from "../types";
import { replaceLocalStorageFiles } from "./localstorage-files";
import { getOrCreateBookmarksPath, getVaultPath } from "./vault-path";
import tagify from "../helpers/tagify";

function getIgnorePaths(): string[] {
  const { ignoreSubfolders } = getPreferenceValues<Preferences>();
  if (!ignoreSubfolders?.trim()) return [];

  return ignoreSubfolders
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

async function getMarkdownFiles(dir: string, ignorePaths: string[]): Promise<Array<string>> {
  const { searchRecursively } = getPreferenceValues<Preferences>();
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const vaultPath = await getVaultPath();

  // Create full ignore paths relative to vault
  const fullIgnorePaths = ignorePaths.map((p) => path.resolve(path.join(vaultPath, p)));

  // Check if current directory should be ignored
  const currentPath = path.resolve(dir);
  if (fullIgnorePaths.some((ignorePath) => currentPath.startsWith(ignorePath))) {
    return [];
  }

  const tasks = entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && searchRecursively) {
      return getMarkdownFiles(fullPath, ignorePaths);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      return [fullPath];
    } else {
      return [];
    }
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

function extractFrontMatter(content: string): {
  attributes: FrontMatter;
  frontmatter: string | null;
  bodyBegin: number;
} {
  try {
    const result = frontMatter<Record<string, unknown>>(content);

    const attributes: FrontMatter = {
      source: typeof result.attributes.source === "string" ? result.attributes.source : "",
      publisher: typeof result.attributes.publisher === "string" ? result.attributes.publisher : null,
      title: typeof result.attributes.title === "string" ? result.attributes.title : "",
      tags: Array.isArray(result.attributes.tags)
        ? result.attributes.tags.filter((tag) => typeof tag === "string")
        : [],
      saved:
        result.attributes.saved instanceof Date
          ? result.attributes.saved
          : typeof result.attributes.saved === "string"
          ? new Date(result.attributes.saved)
          : new Date(),
      read: typeof result.attributes.read === "boolean" ? result.attributes.read : false,
    };

    return {
      attributes,
      frontmatter: result.frontmatter || null,
      bodyBegin: result.bodyBegin,
    };
  } catch (error) {
    console.error(`Error parsing frontmatter: ${error}`);
    return {
      attributes: {
        source: "",
        publisher: null,
        title: "",
        tags: [],
        saved: new Date(),
        read: false,
      },
      frontmatter: null,
      bodyBegin: 0,
    };
  }
}

async function processFile(filePath: string, cachedFiles: Map<string, File>): Promise<File | null> {
  try {
    const stats = await fs.stat(filePath);
    const cachedFile = cachedFiles.get(filePath);

    if (cachedFile && cachedFile.mtime !== 0 && stats.mtimeMs === cachedFile.mtime) {
      return cachedFile;
    }

    const content = await fs.readFile(filePath, { encoding: "utf-8" });
    const { attributes, frontmatter, bodyBegin } = extractFrontMatter(content);

    if (!attributes.title) {
      attributes.title = path.basename(filePath, path.extname(filePath));
    }

    let body = undefined;
    if (bodyBegin > 0) {
      body = content.slice(bodyBegin).trim();
    }

    return {
      attributes,
      frontmatter: frontmatter || undefined,
      body,
      bodyBegin: bodyBegin || undefined,
      fileName: path.basename(filePath),
      fullPath: filePath,
      mtime: stats.mtimeMs,
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

type ProcessCallback = (file: File) => void;

export default async function getObsidianFiles(cachedFiles: File[], onProcess?: ProcessCallback): Promise<Array<File>> {
  const bookmarksPath = await getOrCreateBookmarksPath();
  const ignorePaths = getIgnorePaths();

  const cachedFilesMap = new Map(cachedFiles.map((file) => [file.fullPath, file]));
  const currentFilePaths = new Set<string>();
  const processedFiles: File[] = [];
  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);

  const markdownFiles = await getMarkdownFiles(bookmarksPath, ignorePaths);

  // Process files concurrently but collect results as they complete
  const promises = markdownFiles.map(async (filePath) => {
    currentFilePaths.add(filePath);
    const file = await processFile(filePath, cachedFilesMap);

    if (file && (requiredTags.length === 0 || file.attributes.tags.some((tag) => requiredTags.includes(tag)))) {
      processedFiles.push(file);
      onProcess?.(file);
      return file;
    }
    return null;
  });

  const results = await Promise.allSettled(promises);
  const files = results
    .filter(
      (result): result is PromiseFulfilledResult<File | null> => result.status === "fulfilled" && result.value !== null
    )
    .map((result) => result.value as File);

  // Check for changes after all files are processed
  const hasChanges =
    processedFiles.some((file) => {
      const cached = cachedFilesMap.get(file.fullPath);
      return !cached || cached.mtime !== file.mtime;
    }) || cachedFiles.some((file) => !currentFilePaths.has(file.fullPath));

  if (hasChanges) {
    await replaceLocalStorageFiles(processedFiles);
  }

  return files;
}
