import { getPreferenceValues } from "@raycast/api";
import frontMatter from "front-matter";
import fs from "node:fs/promises";
import path from "node:path";
import { File, FrontMatter, Preferences } from "../types";
import { replaceLocalStorageFiles } from "./localstorage-files";

function isFulfilledPromise<T>(v: PromiseSettledResult<T>): v is PromiseFulfilledResult<T> {
  return v.status === "fulfilled";
}

export default async function getObsidianFiles(): Promise<Array<File>> {
  const prefs = getPreferenceValues<Preferences>();
  const dir = path.join(prefs.vaultPath, prefs.bookmarksPath);

  const files = await fs.readdir(dir);
  const markdown = files.filter((file) => file.endsWith(".md"));
  const promises = markdown.map((file) =>
    fs.readFile(path.join(dir, file), { encoding: "utf-8" }).then((val) => ({
      ...frontMatter<FrontMatter>(val),
      fileName: file,
      fullPath: path.join(dir, file),
    }))
  );

  const results = await Promise.allSettled(promises);
  const fileResults = await results.filter(isFulfilledPromise).map((result) => result.value);
  await replaceLocalStorageFiles(fileResults);

  return fileResults;
}
