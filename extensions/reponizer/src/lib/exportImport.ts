import { LocalStorage } from "@raycast/api";
import type { RemoteInfo, RepoIndex } from "./types";

export interface ExportedRepo {
  path: string;
  origin?: string;
  remotes?: RemoteInfo[];
  offloaded?: boolean;
}

export interface ExportFile {
  schema: "reponizer/repos";
  version: 1;
  exportedAt: string;
  root: string;
  repos: ExportedRepo[];
}

const SNAPSHOT_KEY = "reponizer.snapshot";

/**
 * A lone origin round-trips through `origin` alone; extra remotes and push URLs that differ
 * from the fetch URL would otherwise be lost on import, so those need the full list.
 */
function remotesWorthExporting(remotes: RemoteInfo[]): RemoteInfo[] | undefined {
  const meaningful = remotes.length > 1 || remotes.some((r) => r.pushUrl && r.pushUrl !== r.fetchUrl);
  return meaningful ? remotes : undefined;
}

export function buildExport(index: RepoIndex): ExportFile {
  const repos: ExportedRepo[] = index.entries.map((entry) => {
    if (entry.kind === "offloaded") {
      return {
        path: entry.relativePath,
        origin: entry.originUrl || undefined,
        remotes: remotesWorthExporting(entry.remotes),
        offloaded: true,
      };
    }
    return {
      path: entry.relativePath,
      origin: entry.origin?.fetchUrl,
      remotes: remotesWorthExporting(entry.remotes),
    };
  });
  return {
    schema: "reponizer/repos",
    version: 1,
    exportedAt: new Date().toISOString(),
    root: index.root,
    repos,
  };
}

/**
 * Export entries are written on another machine (or restored from a synced snapshot), so their
 * paths are untrusted input that ends up in `path.join(root, path)`. Only a plain relative path
 * may survive: absolute paths, `..` traversal, backslashes, and NUL bytes are rejected outright.
 * Returns the cleaned POSIX path, or undefined when the entry must not be used.
 */
export function safeRelativePath(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("/") || /[\0\\]/.test(trimmed)) return undefined;
  const segments = trimmed.split("/").filter((segment) => segment !== "" && segment !== ".");
  if (segments.length === 0 || segments.includes("..")) return undefined;
  return segments.join("/");
}

export function parseExportFile(json: string): ExportFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  const file = data as Partial<ExportFile>;
  if (file.schema !== "reponizer/repos" || !Array.isArray(file.repos)) {
    throw new Error("File is not a Reponizer export (expected schema “reponizer/repos”).");
  }
  for (const repo of file.repos) {
    if (typeof repo.path !== "string" || !repo.path) {
      throw new Error("Export contains an entry without a path.");
    }
    const safe = safeRelativePath(repo.path);
    if (!safe) {
      throw new Error(`Export contains an entry whose path escapes the repositories root: ${repo.path}`);
    }
    repo.path = safe;
  }
  return file as ExportFile;
}

export interface ImportPlan {
  /** Entries missing on this machine (with an origin to get them from). */
  missing: ExportedRepo[];
  /** Entries in the export that have no origin URL and therefore cannot be materialized. */
  unresolvable: ExportedRepo[];
  /** Count of entries already present locally. */
  present: number;
  /** Local repos not contained in the export (informational only — never deleted). */
  localOnly: string[];
}

export function planImport(file: ExportFile, index: RepoIndex): ImportPlan {
  const localPaths = new Set(index.entries.map((e) => e.relativePath));
  const importedPaths = new Set(file.repos.map((r) => r.path));
  const absent = file.repos.filter((r) => !localPaths.has(r.path));
  return {
    missing: absent.filter((r) => r.origin),
    unresolvable: absent.filter((r) => !r.origin),
    present: file.repos.length - absent.length,
    localOnly: index.entries.map((e) => e.relativePath).filter((p) => !importedPaths.has(p)),
  };
}

/**
 * Snapshot in Raycast LocalStorage — included in Raycast Cloud Sync where available,
 * and usable as an import source without passing a file around.
 */
export async function saveSnapshot(file: ExportFile): Promise<void> {
  await LocalStorage.setItem(SNAPSHOT_KEY, JSON.stringify(file));
}

export async function loadSnapshot(): Promise<ExportFile | undefined> {
  const raw = await LocalStorage.getItem<string>(SNAPSHOT_KEY);
  if (!raw) return undefined;
  return parseExportFile(raw);
}
