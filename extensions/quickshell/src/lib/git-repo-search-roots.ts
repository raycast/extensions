import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { isMacPlatform } from "./platform";

/** Folder names searched under the user profile (and each drive root on Windows). */
export const COMMON_ROOT_FOLDER_NAMES = [
  "Projects",
  "projects",
  "Developer",
  "dev",
  "Development",
  "code",
  "repos",
  "source",
  "src",
  "Documents",
] as const;

/** Extra top-level profile folders scanned on macOS only. */
export const MAC_ROOT_FOLDER_NAMES = ["Code", "Sites", "workspace", "workspaces", "GitHub"] as const;

/**
 * Nested paths under the user profile only (not every drive).
 * Includes GitHub Desktop's default: Documents/GitHub.
 */
export const COMMON_PROFILE_RELATIVE_NESTED_ROOTS = [["Documents", "GitHub"]] as const;

/** Extra nested profile paths scanned on macOS only. */
export const MAC_PROFILE_RELATIVE_NESTED_ROOTS = [
  ["Library", "Developer"],
  ["Documents", "Projects"],
  ["Desktop", "Projects"],
  ["Desktop", "Developer"],
] as const;

export type BuildSearchRootsOptions = {
  includeDefaultSearchRoots?: boolean;
  /** When set, replaces automatic profile/drive candidate generation (tests / overrides). */
  defaultRootCandidates?: string[];
  home?: string;
  /** Drive roots such as `C:\\`, `D:\\`. When omitted, enumerated on Windows. */
  drives?: string[];
  /** System drive root to exclude from bare-drive candidates (default Windows folder root). */
  systemRoot?: string;
  exists?: (candidate: string) => boolean;
  /** Force path style in tests (`win32` | `posix`). Defaults from process.platform. */
  pathStyle?: "win32" | "posix";
};

function pathApi(options?: BuildSearchRootsOptions): typeof path.posix {
  return useWin32Style(options) ? path.win32 : path.posix;
}

function useWin32Style(options?: BuildSearchRootsOptions): boolean {
  if (options?.pathStyle) {
    return options.pathStyle === "win32";
  }
  // Windows + Linux CI keep win32-style roots (existing tests). Real Mac uses POSIX.
  return !isMacPlatform();
}

/**
 * Workspace-derived roots: each directory plus its parent, skipping parents that are drive roots.
 * Mirrors Core `GitRepoSearchRoots.FromShortcuts`.
 */
export function searchRootsFromWorkspaces(directories: string[], options: BuildSearchRootsOptions = {}): string[] {
  const roots = new Map<string, string>();

  for (const directory of directories) {
    const trimmed = directory.trim();
    if (!trimmed) {
      continue;
    }

    const normalized = tryNormalizeDirectory(trimmed, options);
    if (normalized) {
      roots.set(normalized.toLowerCase(), normalized);
    }

    const parent = tryGetParentDirectory(trimmed, options);
    if (parent) {
      roots.set(parent.toLowerCase(), parent);
    }
  }

  return [...roots.values()];
}

/**
 * Default search roots under the profile and (on Windows) every ready drive.
 * Does **not** include the profile home itself (Core parity).
 */
export function listDefaultRootCandidates(options: BuildSearchRootsOptions = {}): string[] {
  const api = pathApi(options);
  const home = options.home ?? os.homedir();
  const candidates: string[] = [];

  for (const name of COMMON_ROOT_FOLDER_NAMES) {
    candidates.push(api.join(home, name));
  }

  for (const segments of COMMON_PROFILE_RELATIVE_NESTED_ROOTS) {
    candidates.push(api.join(home, ...segments));
  }

  if (!useWin32Style(options)) {
    for (const name of MAC_ROOT_FOLDER_NAMES) {
      candidates.push(api.join(home, name));
    }
    for (const segments of MAC_PROFILE_RELATIVE_NESTED_ROOTS) {
      candidates.push(api.join(home, ...segments));
    }
  }

  if (useWin32Style(options)) {
    const systemRoot = normalizeDriveRoot(options.systemRoot ?? "C:\\", options);
    const drives = options.drives ?? listWindowsDriveRoots();
    for (const drive of drives) {
      const root = normalizeDriveRoot(drive, options);
      for (const name of COMMON_ROOT_FOLDER_NAMES) {
        candidates.push(api.join(root, name));
      }
      if (root.toLowerCase() !== systemRoot.toLowerCase()) {
        candidates.push(root);
      }
    }
  }

  return candidates;
}

/**
 * Build ordered discovery roots: extraRoots first, then defaults.
 * Never adds the user profile home as a scan root.
 */
export function buildSearchRoots(extraRoots: string[] = [], options: BuildSearchRootsOptions = {}): string[] {
  const includeDefaults = options.includeDefaultSearchRoots !== false;
  const exists = options.exists ?? ((candidate: string) => existsSync(candidate));
  const ordered: string[] = [];
  const seen = new Set<string>();

  function add(candidate: string): void {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return;
    }
    const normalized = tryNormalizeDirectory(trimmed, options);
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    if (!exists(normalized)) {
      return;
    }
    seen.add(key);
    ordered.push(normalized);
  }

  for (const root of extraRoots) {
    add(root);
  }

  if (includeDefaults) {
    const defaults = options.defaultRootCandidates ?? listDefaultRootCandidates(options);
    for (const root of defaults) {
      add(root);
    }
  }

  return ordered;
}

function tryNormalizeDirectory(directory: string, options: BuildSearchRootsOptions = {}): string | null {
  try {
    const api = pathApi(options);
    if (useWin32Style(options)) {
      return api.normalize(directory.replace(/\//g, "\\"));
    }
    return api.normalize(directory.replace(/\\/g, "/"));
  } catch {
    return null;
  }
}

function tryGetParentDirectory(directory: string, options: BuildSearchRootsOptions = {}): string | null {
  try {
    const api = pathApi(options);
    const trimmed = directory.trim().replace(/[\\/]+$/, "");
    const normalized = useWin32Style(options)
      ? api.normalize(trimmed.replace(/\//g, "\\"))
      : api.normalize(trimmed.replace(/\\/g, "/"));
    const parent = api.dirname(normalized);
    if (!parent || parent === normalized) {
      return null;
    }

    const driveRoot = api.parse(parent).root;
    if (driveRoot && parent.toLowerCase() === driveRoot.toLowerCase()) {
      return null;
    }

    // On POSIX, skip filesystem root `/`.
    if (!useWin32Style(options) && parent === "/") {
      return null;
    }

    return parent;
  } catch {
    return null;
  }
}

function normalizeDriveRoot(drive: string, options: BuildSearchRootsOptions = {}): string {
  const api = pathApi(options);
  const normalized = api.normalize(drive.trim().replace(/\//g, "\\"));
  if (/^[a-zA-Z]:\\?$/.test(normalized)) {
    return `${normalized.replace(/\\$/, "")}\\`;
  }
  return normalized.endsWith("\\") ? normalized : `${normalized}\\`;
}

function listWindowsDriveRoots(): string[] {
  if (process.platform !== "win32") {
    return [];
  }

  const roots: string[] = [];
  for (let code = "A".charCodeAt(0); code <= "Z".charCodeAt(0); code += 1) {
    const letter = String.fromCharCode(code);
    const root = `${letter}:\\`;
    try {
      if (existsSync(root)) {
        roots.push(root);
      }
    } catch {
      // Ignore inaccessible drive letters.
    }
  }
  return roots;
}
