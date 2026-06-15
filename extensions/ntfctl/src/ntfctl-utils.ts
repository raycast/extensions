import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * Find the directory containing the .applescript files.
 * Looks in dist/scripts/ (bundled) first, then falls back to
 * APPLESCRIPTS_DIR environment variable.
 */
export function findApplescriptsDir(): string {
  const envDir = process.env.APPLESCRIPTS_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return envDir;
  }

  const candidates = [
    path.resolve(__dirname, "scripts"), // bundled in dist/scripts/
    path.resolve(__dirname, "..", "assets", "scripts"), // dev: from src/ to assets/scripts/
    path.resolve(__dirname, "..", "scripts"), // dev: from dist/ to scripts/
  ];

  for (const dir of candidates) {
    const testFile = path.join(dir, "ntfctl-clear.applescript");
    if (fs.existsSync(testFile)) {
      return dir;
    }
  }

  throw new Error(
    "Could not find AppleScript files. Set APPLESCRIPTS_DIR to the directory containing ntfctl-clear.applescript.",
  );
}

/** Find scripts dir once at module load. */
const SCRIPTS_DIR = findApplescriptsDir();

/**
 * Run an AppleScript file and return stdout.
 */
export function runAppleScript(scriptName: string): string {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  return execSync(`osascript "${scriptPath}"`, {
    encoding: "utf-8",
    timeout: 15_000,
  }).trim();
}

/**
 * Run the unified ntfctl.applescript with an action.
 */
export function runControlAction(action: string): string {
  return runAppleScript(action);
}
