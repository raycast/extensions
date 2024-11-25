import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";

import frontMatter from "front-matter";

import { File, FrontMatter, Preferences } from "../types";
import { replaceLocalStorageFiles } from "./localstorage-files";
import { getOrCreateBookmarksPath } from "./vault-path";
import tagify from "../helpers/tagify";

async function getMarkdownFiles(dir: string): Promise<Array<string>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const tasks = entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getMarkdownFiles(fullPath);
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
    // Get file stats first - this is faster than reading the file
    const stats = await fs.stat(filePath);
    const cachedFile = cachedFiles.get(filePath);

    // If we have a valid cached file with matching mtime, use it
    if (cachedFile && cachedFile.mtime !== 0 && stats.mtimeMs === cachedFile.mtime) {
      return cachedFile;
    }

    // If we need to load the file, do it now
    const content = await fs.readFile(filePath, { encoding: "utf-8" });
    const { attributes, frontmatter, bodyBegin } = extractFrontMatter(content);

    // If title is empty after parsing, use filename
    if (!attributes.title) {
      attributes.title = path.basename(filePath, path.extname(filePath));
    }

    // Extract body if we successfully parsed frontmatter
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

export default async function getObsidianFiles(cachedFiles: File[]): Promise<Array<File>> {
  const bookmarksPath = await getOrCreateBookmarksPath();
  const markdownFiles = await getMarkdownFiles(bookmarksPath);

  // Create lookup map for cached files
  const cachedFilesMap = new Map(cachedFiles.map((file) => [file.fullPath, file]));

  // Process all files concurrently
  const results = await Promise.allSettled(markdownFiles.map((filePath) => processFile(filePath, cachedFilesMap)));

  // Get successful results
  const files = results
    .filter((result): result is PromiseFulfilledResult<File | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((file): file is File => file !== null);

  // Apply required tags filter
  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);
  const fileResults =
    requiredTags.length === 0
      ? files
      : files.filter((file) => file.attributes.tags.some((tag) => requiredTags.includes(tag)));

  // Only update localStorage if we have new or updated files
  const hasChanges = fileResults.some((file) => {
    const cached = cachedFilesMap.get(file.fullPath);
    return !cached || cached.mtime !== file.mtime;
  });

  if (hasChanges) {
    await replaceLocalStorageFiles(fileResults);
  }

  return fileResults;
}
