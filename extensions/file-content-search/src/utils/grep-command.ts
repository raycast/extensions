import { DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_EXTENSIONS, preferences } from "../constants";

type GrepCommandOptions = {
  path: string;
  useRegex: boolean;
  maxResults: number;
};

/**
 * Escapes a string for safe use as a shell argument.
 * Wraps in single quotes and escapes any single quotes within.
 */
const shellEscape = (str: string): string => {
  return `'${str.replace(/'/g, "'\\''")}'`;
};

/**
 * Validates and sanitizes an exclude pattern (directory name or extension).
 * Only allows alphanumeric characters, dots, underscores, and hyphens.
 */
const sanitizeExcludePattern = (pattern: string): string | null => {
  const sanitized = pattern.trim();
  if (!/^[\w.-]+$/.test(sanitized)) {
    return null;
  }
  return sanitized;
};

/**
 * Parses a comma-separated string into an array of trimmed values.
 * Removes leading dots from values (e.g., ".png" becomes "png").
 * Filters out patterns with unsafe characters.
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
    .map((item) => item.trim().replace(/^\./, ""))
    .map(sanitizeExcludePattern)
    .filter((item): item is string => item !== null);
};

/**
 * Gets the list of directories to exclude from grep search.
 * @returns Array of directory names to exclude
 */
const getExcludedDirectories = (): string[] => {
  return parseCommaSeparated(preferences.excludedDirectories, DEFAULT_EXCLUDED_DIRS);
};

/**
 * Gets the list of file extensions to exclude from grep search.
 * @returns Array of file extensions to exclude
 */
const getExcludedExtensions = (): string[] => {
  return parseCommaSeparated(preferences.excludedExtensions, DEFAULT_EXCLUDED_EXTENSIONS);
};

/**
 * Builds grep command arguments for spawning without shell.
 * Returns an array of arguments to pass to spawn().
 */
export const buildGrepArgs = (
  query: string,
  { path, useRegex, maxResults }: GrepCommandOptions,
): string[] => {
  const flags = useRegex ? "-rnaEb" : "-rnIFb";

  const excludedDirs = getExcludedDirectories();
  const excludedExts = getExcludedExtensions();

  const args: string[] = [flags];

  for (const d of excludedDirs) {
    args.push(`--exclude-dir=${d}`);
  }
  for (const ext of excludedExts) {
    args.push(`--exclude=*.${ext}`);
  }

  args.push("-m", String(maxResults));
  args.push("--", query, path);

  return args;
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

  const dirExcludes = excludedDirs.map((d) => `--exclude-dir=${shellEscape(d)}`).join(" ");
  const fileExcludes = excludedExts.map((ext) => `--exclude=${shellEscape(`*.${ext}`)}`).join(" ");

  const escapedQuery = shellEscape(query);
  const escapedPath = shellEscape(path);

  return `LC_ALL=en_US.UTF-8 grep ${flags} ${dirExcludes} ${fileExcludes} -m ${maxResults} -- ${escapedQuery} ${escapedPath} 2>/dev/null`;
};
