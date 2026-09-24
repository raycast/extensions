import os from "node:os";
import path from "node:path";

/**
 * Trims, collapses, and lowercases a text value.
 *
 * @param value - Text value to normalize.
 */
export function normalizeText(value?: string): string {
  return (value?.trim() ?? "").replace(/\s+/g, " ").toLowerCase();
}

/**
 * Normalizes search text to lowercase form with single forward slashes.
 *
 * @param value - Text value to normalize for search matching.
 */
export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\\/g, "/").replace(/\/+/g, "/");
}

/**
 * Resolves, normalizes, and deduplicates a comma-separated list of paths.
 *
 * @param input Comma-separated path list.
 * @example
 * normalizeWorkspaceRoots("~/Octarine, ./notes, ~/Octarine")
 * // => ["/Users/me/Octarine", "/current/dir/notes"]
 */
export function normalizeWorkspaceRoots(input: string): string[] {
  const paths = splitList(input).map((p) => {
    return path.normalize(path.resolve(expandHome(p)));
  });

  return [...new Set(paths)];
}

/**
 * Normalizes a comma-separated list of file extensions into a lowercase set without leading dots.
 *
 * @param input Comma-separated extension list.
 * @example
 * normalizeExtensions(".PNG, pdf, txt")
 * // => new Set(["png", "pdf", "txt"])
 */
export function normalizeExtensions(input?: string): Set<string> {
  return new Set(splitList(input).map((ext) => ext.toLowerCase().replace(/^\./, "")));
}

/**
 * Splits a string into whitespace-delimited tokens.
 *
 * @param value Text to tokenize.
 */
export function tokenize(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

/**
 * Expands a leading home-directory marker in a path string.
 *
 * @param input Path that may begin with `~` or `~/`; `~username/...` is not expanded.
 * @example
 * expandHome("~/Octarine")
 * // => "/Users/me/Octarine"
 */
export function expandHome(input: string): string {
  if (input === "~") {
    return os.homedir();
  }

  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

/**
 * Splits a comma-separated list into trimmed non-empty values.
 *
 * @param input Comma-separated value list.
 * @example
 * splitList(" a, b ,, c ")
 * // => ["a", "b", "c"]
 */
export function splitList(input?: string): string[] {
  return (
    input
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

/**
 * Splits a comma-separated list into trimmed lowercase values.
 *
 * @param input Comma-separated value list.
 * @example
 * splitLowerList(" Work , Personal ")
 * // => new Set(["work", "personal"])
 */
export function splitLowerList(input?: string): Set<string> {
  return new Set(splitList(input).map((s) => s.toLowerCase()));
}
