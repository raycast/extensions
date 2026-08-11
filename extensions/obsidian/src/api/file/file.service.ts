import glob from "fast-glob";
import * as path from "path";
import { Logger } from "../logger/logger.service";
import { GetFilePathsHelper } from "./file.types";

const logger = new Logger("File");

export async function getFilePaths(params: GetFilePathsHelper): Promise<string[]> {
  const { path, excludedFolders = [], includedFileExtensions } = params;
  const defaultExcludedDirs = [".git", ".obsidian", ".trash", ".excalidraw", ".mobile"];

  const cleanedExcludes = [...defaultExcludedDirs, ...excludedFolders].filter((dir) => !!dir && dir.trim() !== "");

  const ignorePatterns = cleanedExcludes.map((dir) => `**/${dir}/**`).concat("**/*.excalidraw.md");

  // file extension matcher
  const extensionPattern = includedFileExtensions?.length
    ? includedFileExtensions.length === 1
      ? `**/*.${includedFileExtensions[0].replace(".", "")}`
      : `**/*.{${includedFileExtensions.map((e) => e.replace(".", "")).join(",")}}`
    : "**/*";

  const options = {
    cwd: path,
    ignore: ignorePatterns,
    onlyFiles: true,
    absolute: true,
    dot: false,
  };

  logger.info(`Globbing files with option ${JSON.stringify(options)}`);

  const files = await glob(extensionPattern, options);
  logger.success(`Globbed ${files.length} file paths.`);
  return files;
}

/**
 * Checks if a path should be excluded based on a list of exluded paths
 */
export function isPathExcluded(pathToCheck: string, excludedPaths: string[]) {
  const normalizedPath = path.normalize(pathToCheck);

  return excludedPaths.some((excluded) => {
    if (!excluded) return false;

    const normalizedExcluded = path.normalize(excluded);

    // Check if the path is exactly the excluded path or is a subfolder
    return normalizedPath === normalizedExcluded || normalizedPath.startsWith(normalizedExcluded + path.sep);
  });
}
