import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";

import frontMatter from "front-matter";

import { File, FrontMatter, Preferences } from "../types";
import { replaceLocalStorageFiles } from "./localstorage-files";
import { getOrCreateBookmarksPath } from "./vault-path";
import tagify from "../helpers/tagify";

function isFulfilledPromise<T>(v: PromiseSettledResult<T>): v is PromiseFulfilledResult<T> {
  return v.status === "fulfilled";
}

async function getMarkdownFiles(dir: string): Promise<Array<string>> {
  let markdownFiles: Array<string> = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subDirFiles = await getMarkdownFiles(fullPath);
      markdownFiles = markdownFiles.concat(subDirFiles);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(fullPath);
    }
  }
  return markdownFiles;
}

export default async function getObsidianFiles(): Promise<Array<File>> {
  const bookmarksPath = await getOrCreateBookmarksPath();
  const markdownFiles = await getMarkdownFiles(bookmarksPath);
  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);

  const promises = markdownFiles.map((file) =>
    fs.readFile(file, { encoding: "utf-8" }).then((val) => {
      const frontMatterData = frontMatter<FrontMatter>(val);
      const attributes = frontMatterData.attributes || {};
      // Filter based on requiredTags
      if (requiredTags.length > 0) {
        const tags = attributes.tags || [];
        const hasRequiredTag = tags.some((tag) => requiredTags.includes(tag));
        if (!hasRequiredTag) {
          return null; // Return null or undefined to filter out this file
        }
      }
      // Set a default title if it doesn't exist
      if (!attributes.title) {
        // Use the file name without extension as the default title
        attributes.title = path.basename(file, path.extname(file));
      }
      return {
        ...frontMatterData,
        attributes,
        fileName: path.basename(file),
        fullPath: file,
      };
    })
  );

  const results = await Promise.allSettled(promises);
  const fileResults = results
    .filter(isFulfilledPromise)
    .map((result) => result.value)
    .filter((file) => file !== null); // Filter out null results
  await replaceLocalStorageFiles(fileResults);
  return fileResults;
}
