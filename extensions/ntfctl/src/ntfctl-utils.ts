import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

let _scriptsDir: string | null = null;

/**
 * Find the directory containing the .applescript files.
 * Looks in dist/scripts/ (bundled) first, then falls back to
 * APPLESCRIPTS_DIR environment variable.
 * Lazily resolved on first call so a missing directory doesn't
 * crash the extension at module load.
 */
export function findApplescriptsDir(): string {
  if (_scriptsDir) return _scriptsDir;

  const envDir = process.env.APPLESCRIPTS_DIR;
  if (envDir && fs.existsSync(envDir)) {
    _scriptsDir = envDir;
    return _scriptsDir;
  }

  const candidates = [
    path.resolve(__dirname, "scripts"), // bundled in dist/scripts/
    path.resolve(__dirname, "..", "assets", "scripts"), // dev: from src/ to assets/scripts/
    path.resolve(__dirname, "..", "scripts"), // dev: from dist/ to scripts/
  ];

  for (const dir of candidates) {
    const testFile = path.join(dir, "ntfctl-clear.applescript");
    if (fs.existsSync(testFile)) {
      _scriptsDir = dir;
      return _scriptsDir;
    }
  }

  throw new Error(
    "Could not find AppleScript files. Set APPLESCRIPTS_DIR to the directory containing ntfctl-clear.applescript.",
  );
}

/**
 * Run an AppleScript file and return stdout.
 */
export function runAppleScript(scriptName: string): string {
  const dir = findApplescriptsDir();
  const scriptPath = path.join(dir, scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  return execSync(`osascript "${scriptPath}"`, {
    encoding: "utf-8",
    timeout: 15_000,
  }).trim();
}
