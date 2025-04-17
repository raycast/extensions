import { useCachedPromise } from "@raycast/utils";
import path from "path";
import { DirectoryInfo, DirectoryMap } from "./types";
import { FunctionReturningPromise } from "@raycast/utils/dist/types";

export function extractDirectoryInfo(directoryPath: string): DirectoryInfo {
  const fullPath = path.resolve(directoryPath); // Ensures we have the absolute path
  const name = path.basename(fullPath); // Gets the directory name
  const parent = path.basename(path.dirname(fullPath)); // Gets the parent directory name

  return { path: fullPath, parent: parent, name: name };
}

export function nullSafeUseCachedPromise<T extends FunctionReturningPromise<[]>>(fn: T): string[] {
  const { data: cachedPromise } = useCachedPromise(fn);
  if (cachedPromise) {
    return cachedPromise;
  }
  return [];
}

export function convertToFindFilter(includeFilters: string) {
  return includeFilters
    .split(";")
    .map((filter) => "-name " + filter)
    .join(" -or ");
}

export function parseDirectoryOutput(output: string): DirectoryMap {
  return output
    .split("\n")
    .filter((line) => line.trim())
    .reduce((acc: DirectoryMap, path: string) => {
      const directoryInfo = extractDirectoryInfo(path);
      if (!acc[directoryInfo.parent]) {
        acc[directoryInfo.parent] = [];
      }
      acc[directoryInfo.parent].push(directoryInfo);
      return acc;
    }, {});
} 