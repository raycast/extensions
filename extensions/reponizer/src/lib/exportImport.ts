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

export function buildExport(index: RepoIndex): ExportFile {
  const repos: ExportedRepo[] = index.entries.map((entry) => {
    if (entry.kind === "offloaded") {
      return {
        path: entry.relativePath,
        origin: entry.originUrl || undefined,
        remotes: entry.remotes.length > 1 ? entry.remotes : undefined,
        offloaded: true,
      };
    }
    return {
      path: entry.relativePath,
      origin: entry.origin?.fetchUrl,
      remotes: entry.remotes.length > 1 ? entry.remotes : undefined,
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
