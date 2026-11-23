import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);

/**
 * SF Symbols 27.2 ships a command-line tool inside the app bundle. Everything this extension
 * does beyond the bundled catalog (current symbol list, Apple's tag search, local rendering,
 * export) goes through it, so its absence is the single switch between the two modes.
 */
const APP_CANDIDATES = ["/Applications/SF Symbols.app", path.join(os.homedir(), "Applications", "SF Symbols.app")];

const CLI_RELATIVE = path.join("Contents", "Executables", "sfsymbols");

export type SFSymbolsApp = {
  appPath: string;
  cliPath: string;
};

/** The installed SF Symbols app that carries the CLI, or null when none does (pre-27.2 or not installed). */
export function findSFSymbolsApp(): SFSymbolsApp | null {
  for (const appPath of APP_CANDIDATES) {
    const cliPath = path.join(appPath, CLI_RELATIVE);
    if (existsSync(cliPath)) return { appPath, cliPath };
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
