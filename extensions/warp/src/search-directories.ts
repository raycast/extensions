import os from "node:os";
import { execFile } from "node:child_process";
import { SearchResult } from "./types";

// Absolute path so the lookup doesn't depend on the user's PATH.
const MDFIND_PATH = "/usr/bin/mdfind";

// Windows paths can't contain "|", so it's a safe separator for passing the
// configured roots to PowerShell through an environment variable.
const WINDOWS_ROOT_DELIMITER = "|";

/**
 * The folders directory search should be scoped to. Falls back to the user's
 * home directory when no root folders have been configured, so search is never
 * system-wide.
 */
export function getEffectiveRoots(roots: string[]): string[] {
  const cleaned = roots.map((root) => root.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [os.homedir()];
}

function toSearchResult(path: string): SearchResult {
  return { name: path.replace(os.homedir(), "~"), path };
}

/**
 * macOS: query Spotlight (mdfind) scoped to each root via `-onlyin`. mdfind
 * accepts only one `-onlyin` per invocation, so we run one search per root in
 * parallel and merge the results. A missing or unreadable root resolves to an
 * empty list rather than failing the whole search.
 */
export function searchDirectoriesMac(
  query: string,
  roots: string[],
  maxResults: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const runForRoot = (root: string) =>
    new Promise<string[]>((resolve) => {
      execFile(
        MDFIND_PATH,
        ["-onlyin", root, `kind:folders ${query}`],
        { maxBuffer: 16 * 1024 * 1024, timeout: 15000, signal },
        (error, stdout) => {
          if (error || !stdout) {
            resolve([]);
            return;
          }
          resolve(
            stdout
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          );
        }
      );
    });

  return Promise.all(roots.map(runForRoot)).then((perRoot) => {
    const seen = new Set<string>();
    const merged: SearchResult[] = [];

    for (const paths of perRoot) {
      for (const path of paths) {
        if (seen.has(path)) continue;
        seen.add(path);
        merged.push(toSearchResult(path));
        if (merged.length >= maxResults) return merged;
      }
    }

    return merged;
  });
}

/**
 * Windows: recursively list directories under each configured root with
 * PowerShell. Roots and the query are passed via environment variables so paths
 * never get interpolated into the command string.
 */
export function searchDirectoriesWindows(
  query: string,
  roots: string[],
  maxResults: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    const psCommand = [
      "$roots = $env:WARP_SEARCH_ROOTS -split '\\|';",
      "Get-ChildItem -LiteralPath $roots -Directory -Recurse -Depth 5 -ErrorAction SilentlyContinue |",
      "Where-Object { $_.Name -like ('*' + $env:WARP_SEARCH_QUERY + '*') } |",
      `Select-Object -First ${maxResults} -ExpandProperty FullName`,
    ].join(" ");

    const env = {
      ...process.env,
      WARP_SEARCH_QUERY: query,
      WARP_SEARCH_ROOTS: roots.join(WINDOWS_ROOT_DELIMITER),
    };

    execFile("powershell", ["-NoProfile", "-Command", psCommand], { timeout: 15000, env, signal }, (error, stdout) => {
      if (error || !stdout) {
        resolve([]);
        return;
      }
      resolve(
        stdout
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map((path) => toSearchResult(path.trim()))
      );
    });
  });
}
