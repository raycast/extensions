import type { SearchError } from "../types/search";
import type { SearchMode } from "../types/preferences";

/**
 * Glob validation is deliberately syntactic-light: ripgrep is the authority on
 * glob syntax and reports its own errors. This only rejects values that could
 * never be a valid pattern or that would corrupt an argv entry.
 */
export function validateGlob(glob: string): SearchError | null {
  const trimmed = glob.trim();
  if (trimmed.length === 0) {
    return { kind: "invalid-glob", message: "Glob pattern is empty." };
  }
  if (trimmed.includes("\0") || trimmed.includes("\n")) {
    return { kind: "invalid-glob", message: `Glob contains invalid characters: ${trimmed}` };
  }
  return null;
}

/**
 * Advisory pre-check for the UI and the authoritative check for the Node.js
 * fallback engine. JS `RegExp` and ripgrep's Rust regex dialects differ, so
 * ripgrep's own error reporting stays authoritative for ripgrep engines.
 */
export function validateQuery(query: string, mode: SearchMode): SearchError | null {
  if (query.length === 0) {
    return { kind: "invalid-query", message: "Query is empty." };
  }
  if (mode === "regex") {
    try {
      new RegExp(query);
    } catch (error) {
      return {
        kind: "invalid-query",
        message: error instanceof Error ? error.message : "Invalid regular expression.",
      };
    }
  }
  return null;
}

/** Extensions become `--glob=*.<ext>` argv entries; only safe name characters pass. */
export function sanitizeExtensions(extensions: string[]): string[] {
  return extensions.map((ext) => ext.trim().replace(/^\.+/, "")).filter((ext) => /^[A-Za-z0-9_+-]+$/.test(ext));
}

/** Excluded directory entries are plain names, never paths or patterns. */
export function sanitizeDirectoryNames(names: string[]): string[] {
  return names.map((name) => name.trim()).filter((name) => name.length > 0 && !/[/\\\0\n*?[\]{}!]/.test(name));
}
