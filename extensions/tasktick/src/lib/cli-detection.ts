// src/lib/cli-detection.ts
import { promises as fs, constants as fsConstants } from "node:fs";

const PROD_FALLBACKS = [
  "/usr/local/bin/tasktick",
  "/opt/homebrew/bin/tasktick",
  // CLI lives in Contents/cli/ (not Contents/MacOS/) to avoid the
  // case-insensitive APFS collision between 'TaskTick' (GUI) and
  // 'tasktick' (CLI). See TaskTick scripts/release.sh.
  "/Applications/TaskTick.app/Contents/cli/tasktick",
];

const DEV_FALLBACKS = [
  "/Applications/TaskTick Dev.app/Contents/MacOS/tasktick-dev",
  "/usr/local/bin/tasktick-dev",
  "/opt/homebrew/bin/tasktick-dev",
];

async function isExecutable(path: string): Promise<boolean> {
  try {
    await fs.access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the first existing + executable path.
 *
 * Order:
 * 1. `preferred` (user-supplied via Preferences) — highest priority always
 * 2. Dev fallbacks (only when `isDev=true`) — TaskTick Dev.app's tasktick-dev binary
 * 3. Prod fallbacks — /usr/local/bin/tasktick → /opt/homebrew → /Applications/TaskTick.app
 *
 * @param preferred Optional user-supplied path from preferences.
 * @param isDev Pass true when Raycast extension runs under `ray develop`.
 *              Set explicit `false` for production runs (Store-installed extension).
 * @param overrides Override the fallback chain entirely (mainly for tests).
 */
export async function resolveCliPath(
  preferred: string | undefined,
  isDev: boolean = false,
  overrides?: string[],
): Promise<string | null> {
  if (preferred && preferred.trim().length > 0) {
    return (await isExecutable(preferred)) ? preferred : null;
  }
  const fallbacks =
    overrides ??
    (isDev ? [...DEV_FALLBACKS, ...PROD_FALLBACKS] : PROD_FALLBACKS);
  for (const candidate of fallbacks) {
    if (await isExecutable(candidate)) return candidate;
  }
  return null;
}

export const CLI_FALLBACK_PATHS = PROD_FALLBACKS;
