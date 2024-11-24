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

export default async function getObsidianFiles(): Promise<Array<File>> {
  const bookmarksPath = await getOrCreateBookmarksPath();
  const markdownFiles = await getMarkdownFiles(bookmarksPath);
  const promises = markdownFiles.map((file) =>
    fs.readFile(file, { encoding: "utf-8" }).then((val) => {
      const frontMatterData = frontMatter<FrontMatter>(val);
      const attributes = frontMatterData.attributes || {};
      // Set a default title if it doesn't exist
      if (!attributes.title) {
        attributes.title = path.basename(file, path.extname(file)); // Use the file name without extension as the default title
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
  const fileResults = results.filter(isFulfilledPromise).map((result) => result.value);

  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);
  let filteredFileResults = fileResults;
  // Only filter if requiredTags is non-empty
  if (requiredTags.length > 0) {
    filteredFileResults = fileResults.filter((file) => {
      const tags = file.attributes.tags || [];
      return tags.some((tag) => requiredTags.includes(tag));
    });
  }

  await replaceLocalStorageFiles(filteredFileResults);
  return filteredFileResults;
}
