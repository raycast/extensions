import fs from "node:fs";
import path from "node:path";

/**
 * Locating the `fd` binary.
 *
 * fd is not bundled: it is a third-party tool the user installs. Homebrew puts
 * it under a different prefix on Apple Silicon and Intel, and a manual install
 * can be anywhere on PATH, so every location is probed rather than assumed.
 * When it is missing the extension reports how to install it and never installs
 * anything itself.
 */

/** Homebrew prefixes plus the common manual locations. */
export const FD_DIRECTORIES = [
  "/opt/homebrew/bin", // Homebrew on Apple Silicon
  "/usr/local/bin", // Homebrew on Intel, and most manual installs
  "/opt/local/bin", // MacPorts
  "/usr/bin",
] as const;

/** `fdfind` is the Debian name; harmless to accept on macOS too. */
const FD_NAMES = ["fd", "fdfind"] as const;

export type FdLookup =
  | { kind: "found"; path: string; source: "preference" | "path" | "known" }
  | { kind: "missing"; reason: string }
  | { kind: "unusable"; path: string; reason: string };

export const FD_INSTALL_HINT =
  "Install fd with `brew install fd`, then run Rebuild Search Index. " +
  "If fd is installed somewhere unusual, set its full path in this extension's preferences.";

function isExecutableFile(candidate: string): boolean {
  try {
    // Follow symlinks: Homebrew's bin entries are links into the Cellar.
    if (!fs.statSync(candidate).isFile()) return false;
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Directories from PATH, ignoring the relative entries `execvp` would skip. */
function pathDirectories(env: NodeJS.ProcessEnv): string[] {
  return (env.PATH ?? "")
    .split(path.delimiter)
    .filter((entry) => entry !== "" && path.isAbsolute(entry));
}

/**
 * Find fd, preferring an explicit preference so an unusual install can be
 * pointed at directly.
 *
 * A preference that does not resolve is reported as `unusable` rather than
 * silently falling back: a user who typed a path wants to know it was wrong.
 */
export function findFd(
  preference?: string,
  env: NodeJS.ProcessEnv = process.env,
  probe: (candidate: string) => boolean = isExecutableFile,
): FdLookup {
  const explicit = preference?.trim();
  if (explicit) {
    if (!path.isAbsolute(explicit))
      return {
        kind: "unusable",
        path: explicit,
        reason: "The fd path preference must be an absolute path.",
      };
    if (probe(explicit))
      return { kind: "found", path: explicit, source: "preference" };
    return {
      kind: "unusable",
      path: explicit,
      reason: `No executable fd at ${explicit}.`,
    };
  }

  for (const directory of pathDirectories(env))
    for (const name of FD_NAMES) {
      const candidate = path.join(directory, name);
      if (probe(candidate))
        return { kind: "found", path: candidate, source: "path" };
    }

  // Raycast does not inherit a login shell's PATH, so the usual prefixes are
  // probed directly rather than relying on the environment.
  for (const directory of FD_DIRECTORIES)
    for (const name of FD_NAMES) {
      const candidate = path.join(directory, name);
      if (probe(candidate))
        return { kind: "found", path: candidate, source: "known" };
    }

  return {
    kind: "missing",
    reason: "fd was not found on PATH or in the usual install locations.",
  };
}

/** One sentence naming the problem, for a toast or a status line. */
export function describeFdLookup(lookup: FdLookup): string | undefined {
  if (lookup.kind === "found") return undefined;
  return `${lookup.reason} ${FD_INSTALL_HINT}`;
}
