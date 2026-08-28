// Discovery of the yerd CLI binary. Resolution order:
//   1. `yerdPath` preference override (throws naming the path if invalid)
//   2. Default app-support location (~/Library/Application Support/io.yerd.Yerd/bin/yerd)
//   3. Directories on $PATH
//   4. Well-known fallback locations
// The winning path is memoized per process.
//
// NOTE: this module must stay importable outside the Raycast runtime (unit
// tests, CLI probes), so it never imports @raycast/api — preferences are
// passed in by the caller.

import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { YerdNotInstalledError } from "./errors";

interface Prefs {
  yerdPath?: string;
}

let _cached: string | null = null;

function isExecutable(p: string): boolean {
  try {
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Computed lazily (not at module load) so tests can override $HOME first. */
function defaultBinaryPath(): string {
  return join(
    process.env.HOME ?? "",
    "Library",
    "Application Support",
    "io.yerd.Yerd",
    "bin",
    "yerd",
  );
}

function fallbackPaths(): string[] {
  return [
    "/opt/homebrew/bin/yerd",
    "/usr/local/bin/yerd",
    join(process.env.HOME ?? "", ".local", "bin", "yerd"),
  ];
}

export function resolveYerdBinary(prefs?: Prefs): string {
  if (_cached) return _cached;

  // 1. Preference override
  const override = prefs?.yerdPath?.trim() ?? "";
  if (override) {
    if (!isExecutable(override)) throw new YerdNotInstalledError(override);
    _cached = override;
    return _cached;
  }

  // 2. Default application support path
  const defaultBinary = defaultBinaryPath();
  if (isExecutable(defaultBinary)) {
    _cached = defaultBinary;
    return _cached;
  }

  // 3. PATH entries
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue;
    const candidate = join(dir, "yerd");
    if (isExecutable(candidate)) {
      _cached = candidate;
      return _cached;
    }
  }

  // 4. Well-known fallback paths
  for (const p of fallbackPaths()) {
    if (isExecutable(p)) {
      _cached = p;
      return _cached;
    }
  }

  throw new YerdNotInstalledError();
}

/** Reset the per-process cache (for tests only). */
export function _resetCache(): void {
  _cached = null;
}
