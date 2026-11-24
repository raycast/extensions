import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);

/**
 * SF Symbols 27.2 ships the command-line tool this extension uses inside the app bundle. Everything this extension
 * does beyond the bundled catalog (current symbol list, Apple's tag search, local rendering,
 * export) goes through it, so its absence is the single switch between the two modes.
 */
const APP_CANDIDATES = ["/Applications/SF Symbols.app", path.join(os.homedir(), "Applications", "SF Symbols.app")];

const CLI_RELATIVE = path.join("Contents", "Executables", "sfsymbols");

export type SFSymbolsApp = {
  appPath: string;
  cliPath: string;
};

/**
 * Earlier SF Symbols releases can already carry an `sfsymbols` executable, but it predates the
 * `search --json` and `export --names-file` interface this extension speaks. It exits at once, and
 * the extension's write to its stdin then fails with `write EPIPE`. The file's presence therefore
 * proves nothing; the app's version decides.
 */
const MINIMUM_VERSION = [27, 2];

/** True when a dotted version ("27.2", "28.0.1") is at least the minimum; anything unreadable is not. */
export function meetsMinimumVersion(version: string): boolean {
  const parts = version.trim().split(".").map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return false;
  for (let i = 0; i < MINIMUM_VERSION.length; i++) {
    const part = parts[i] ?? 0;
    if (part !== MINIMUM_VERSION[i]) return part > MINIMUM_VERSION[i];
  }
  return true;
}

function appVersion(appPath: string): string | null {
  try {
    return execFileSync(
      "/usr/bin/plutil",
      ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", path.join(appPath, "Contents", "Info.plist")],
      { encoding: "utf8" },
    );
  } catch {
    return null;
  }
}

/** The installed SF Symbols app whose CLI this extension can drive (27.2+), or null (older, or not installed). */
export function findSFSymbolsApp(): SFSymbolsApp | null {
  for (const appPath of APP_CANDIDATES) {
    const cliPath = path.join(appPath, CLI_RELATIVE);
    if (!existsSync(cliPath)) continue;
    const version = appVersion(appPath);
    if (version !== null && meetsMinimumVersion(version)) return { appPath, cliPath };
  }
  return null;
}

/** Runs the CLI with a buffer large enough for the full-catalog JSON (several MB). */
export async function runCLI(app: SFSymbolsApp, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(app.cliPath, args, { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/**
 * Ranked symbol names for a query, using Apple's own matcher: name components, aliases,
 * tags and word forms ("delete" finds `trash`), plus glyph and code-point lookup.
 */
export async function searchCLI(app: SFSymbolsApp, query: string): Promise<string[]> {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  // `--` so a query starting with a dash is a query, not an option.
  const stdout = await runCLI(app, ["search", "--limit", "0", "--", ...terms]);
  return stdout.split("\n").filter(Boolean);
}
