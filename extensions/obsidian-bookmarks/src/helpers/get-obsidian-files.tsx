import fs from "node:fs/promises";
import path from "node:path";

import frontMatter from "front-matter";

import { File, FrontMatter } from "../types";
import { replaceLocalStorageFiles } from "./localstorage-files";
import { getOrCreateBookmarksPath } from "./vault-path";

function isFulfilledPromise<T>(v: PromiseSettledResult<T>): v is PromiseFulfilledResult<T> {
  return v.status === "fulfilled";
}

export default async function getObsidianFiles(): Promise<Array<File>> {
  const bookmarksPath = await getOrCreateBookmarksPath();

  const files = await fs.readdir(bookmarksPath);
  const markdown = files.filter((file) => file.endsWith(".md"));
  const promises = markdown.map((file) =>
    fs.readFile(path.join(bookmarksPath, file), { encoding: "utf-8" }).then((val) => ({
      ...frontMatter<FrontMatter>(val),
      fileName: file,
      fullPath: path.join(bookmarksPath, file),
    }))
  );

  const results = await Promise.allSettled(promises);
  const fileResults = await results.filter(isFulfilledPromise).map((result) => result.value);
  await replaceLocalStorageFiles(fileResults);

  return fileResults;
}
