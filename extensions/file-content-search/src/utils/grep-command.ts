import { DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_EXTENSIONS, getPreferences } from "../constants";

type GrepCommandOptions = {
  path: string;
  useRegex: boolean;
  maxResults: number;
};

/**
 * Parses a comma-separated string into an array of trimmed values.
 * Removes leading dots from values (e.g., ".png" becomes "png").
 * @param value - The comma-separated string to parse
 * @param defaults - Default values to return if input is empty
 * @returns Array of parsed values or defaults
 */
const parseCommaSeparated = (value: string | undefined, defaults: string[]): string[] => {
  if (!value?.trim()) {
    return defaults;
  }
  return value
    .split(",")
    .map((item) => item.trim().replace(/^\./, "")) // (.png -> png)
    .filter(Boolean);
};

/**
 * Gets the list of directories to exclude from grep search.
 * @returns Array of directory names to exclude
 */
const getExcludedDirectories = (): string[] => {
  const { excludedDirectories } = getPreferences();
  return parseCommaSeparated(excludedDirectories, DEFAULT_EXCLUDED_DIRS);
};

/**
 * Gets the list of file extensions to exclude from grep search.
 * @returns Array of file extensions to exclude
 */
const getExcludedExtensions = (): string[] => {
  const { excludedExtensions } = getPreferences();
  return parseCommaSeparated(excludedExtensions, DEFAULT_EXCLUDED_EXTENSIONS);
};

/**
 * Builds a grep command string for searching files.
 * @param query - The search query string
 * @param options - Configuration options for the grep command
 * @param options.path - The directory path to search in
 * @param options.useRegex - Whether to use extended regex mode
 * @param options.maxResults - Maximum number of results to return
 * @returns The complete grep command string
 */
export const buildGrepCommand = (
  query: string,
  { path, useRegex, maxResults }: GrepCommandOptions,
): string => {
  const flags = useRegex ? "-rnaEb" : "-rnIFb";

  const excludedDirs = getExcludedDirectories();
  const excludedExts = getExcludedExtensions();

  const dirExcludes = excludedDirs.map((d) => `--exclude-dir=${d}`).join(" ");
  const fileExcludes = excludedExts.map((ext) => `--exclude=*.${ext}`).join(" ");

  const escapedQuery = query.replace(/'/g, "'\\''");

  return `LC_ALL=en_US.UTF-8 grep ${flags} ${dirExcludes} ${fileExcludes} '${escapedQuery}' "${path}" 2>/dev/null | head -n ${maxResults}`;
};
