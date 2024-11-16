import fs from "node:fs/promises";
import path from "node:path";

import frontMatter from "front-matter";

import { File, FrontMatter } from "../types";
import { replaceLocalStorageFiles } from "./localstorage-files";
import { getOrCreateBookmarksPath } from "./vault-path";

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
  const promises = markdownFiles.map((file) =>
    fs.readFile(file, { encoding: "utf-8" }).then((val) => ({
      ...frontMatter<FrontMatter>(val),
      fileName: path.basename(file),
      fullPath: file,
    }))
  );
  const results = await Promise.allSettled(promises);
  const fileResults = results.filter(isFulfilledPromise).map((result) => result.value);
  await replaceLocalStorageFiles(fileResults);
  return fileResults;
}
