// The folders side of the service: where code lives (DigUp: CodeFolders.swift), whether macOS lets Dig Up read a
// folder, what's indexed under each chosen folder (DigUp: Engine.rootSummaries), and folder estimates (DigUp: digup
// estimate, Estimates.swift).

import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { opendir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { FolderEstimate, FolderSummary } from "./api";
import { crawl } from "./crawler";
import { addEstimates, emptyEstimate, estimatesBySubfolder, lookUpFacts, type Costs, type Estimate } from "./estimator";
import type { Helper } from "./helper";
import { FolderSelection, lastPathComponent } from "./rules";
import { Store } from "./store";
import type { FileKind, IndexOptions } from "./types";

/** A folder as DigUp's settings keep one: `~` expanded, symlinks resolved, standardized. */
export function folderPath(path: string, home = homedir()): string {
  const expanded = path === "~" ? home : path.startsWith("~/") ? join(home, path.slice(2)) : path;
  try {
    return realpathSync(expanded);
  } catch {
    return expanded;
  }
}

export function isFolder(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** The folder can be listed. One macOS won't let Dig Up read looks empty to a walk, which must never be taken for
 *  "everything in it was deleted". */
export function isReadable(path: string): boolean {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Code folders
// ---------------------------------------------------------------------------------------------------------------------

/** Home folders that macOS asks about, or that are searched as documents: not offered for code. */
const ASKED = new Set([
  "Desktop",
  "Documents",
  "Downloads",
  "Library",
  "Pictures",
  "Movies",
  "Music",
  "Public",
  "Applications",
  "Sites",
]);
const USUAL_CODE_NAMES = ["GitHub", "Code", "Projects", "Developer", "dev", "src", "repos", "Repositories"];

/** A repo, or a folder with one in it (one level down: its first 500 names, hidden ones left out). */
export function holdsCode(folder: string): boolean {
  if (existsSync(join(folder, ".git"))) return true;
  let children: string[];
  try {
    children = readdirSync(folder);
  } catch {
    return false;
  }
  return children.slice(0, 500).some((name) => !name.startsWith(".") && existsSync(join(folder, name, ".git")));
}

/**
 * Where people keep code: the home folder's folders that hold a repo (themselves or one level down), and in Documents
 * or Desktop, when they're searched already, the usual names repos live under. By name, as the Finder sorts.
 */
export function suggestCodeFolders(searched: readonly string[], home = homedir()): string[] {
  const found: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(home);
  } catch {
    // no home listing: nothing to offer
  }
  for (const name of names) {
    if (name.startsWith(".") || ASKED.has(name)) continue;
    const folder = folderPath(join(home, name), home);
    if (isFolder(folder) && holdsCode(folder)) found.push(folder);
  }
  for (const parent of ["Documents", "Desktop"]) {
    const folder = join(home, parent);
    if (!searched.some((root) => root === folder || FolderSelection.isInside(folder, root))) continue;
    for (const name of USUAL_CODE_NAMES) {
      const inner = folderPath(join(folder, name), home);
      if (isFolder(inner) && holdsCode(inner)) found.push(inner);
    }
  }
  return found.sort((a, b) =>
    lastPathComponent(a).localeCompare(lastPathComponent(b), "en", { numeric: true, sensitivity: "base" }),
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------------------------------------------------

/** Whether each folder can be read (opendir); a refusal names what to do. */
export async function access(
  folders: readonly string[],
  signal?: AbortSignal,
): Promise<{ folder: string; readable: boolean; error?: string }[]> {
  const out: { folder: string; readable: boolean; error?: string }[] = [];
  for (const folder of folders) {
    signal?.throwIfAborted();
    try {
      const dir = await opendir(folder);
      await dir.close();
      out.push({ folder, readable: true });
    } catch (error) {
      const code = (error as { code?: string }).code;
      const why =
        code === "EPERM" || code === "EACCES"
          ? "macOS doesn't let Dig Up read it: give Raycast Full Disk Access, or access to this folder"
          : code === "ENOENT"
            ? "it isn't there"
            : code === "ENOTDIR"
              ? "it isn't a folder"
              : (error as Error).message;
      out.push({ folder, readable: false, error: why });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// What's indexed under each folder
// ---------------------------------------------------------------------------------------------------------------------

/** Counts by state and kind of the files under each chosen folder (an index range scan per folder). */
export function folderSummaries(
  store: Store | null,
  roots: readonly string[],
  problems: { missing: ReadonlySet<string>; unreadable: ReadonlySet<string> },
): FolderSummary[] {
  return roots.map((folder) => {
    const summary: FolderSummary = {
      folder,
      missing: problems.missing.has(folder) || !isFolder(folder),
      unreadable: problems.unreadable.has(folder),
      files: 0,
      indexed: 0,
      pending: 0,
      failed: 0,
      skipped: 0,
      unfinished: 0,
      byKind: {},
    };
    if (!store) return summary;
    const seen = new Set<string>();
    for (const range of Store.pathRanges(folder)) {
      if (seen.has(range.from)) continue;
      seen.add(range.from);
      for (const row of store.all(
        "SELECT kind, state, COUNT(*) AS n FROM files WHERE path >= ? AND path < ? GROUP BY kind, state",
        range.from,
        range.to,
      )) {
        const n = Number(row.n);
        const kind = String(row.kind) as FileKind;
        summary.files += n;
        summary.byKind[kind] = (summary.byKind[kind] ?? 0) + n;
        switch (String(row.state)) {
          case "done":
            summary.indexed += n;
            break;
          case "partial":
            summary.indexed += n;
            summary.unfinished += n;
            break;
          case "pending":
            summary.pending += n;
            break;
          case "failed":
            summary.failed += n;
            break;
          default:
            summary.skipped += n;
        }
      }
    }
    return summary;
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------------------------------------------------

function toFolderEstimate(
  folder: string,
  estimate: Estimate,
  skipped: Record<string, number>,
  code: boolean,
): FolderEstimate {
  const files = Object.values(estimate.files).reduce((sum, n) => sum + (n ?? 0), 0);
  const out: FolderEstimate = {
    folder,
    files,
    byKind: estimate.files,
    skipped,
    seconds: estimate.seconds,
    laterSeconds: estimate.laterSeconds,
    readable: true,
    pdfPages: estimate.pdfPages,
    longFiles: estimate.longFiles,
    audioSeconds: estimate.audioSeconds,
    videoSeconds: estimate.videoSeconds,
  };
  if (code) out.bytes = estimate.bytes;
  return out;
}

/**
 * One folder's estimate (DigUp: `digup estimate --json`), with its subfolders one level down, biggest first. `folder`
 * comes back as it was given. A folder that isn't there or can't be read is `readable: false`.
 */
export async function estimateFolder(
  folder: string,
  options: IndexOptions,
  costs: Costs,
  helper: Pick<Helper, "walk" | "pages" | "durations">,
  signal?: AbortSignal,
): Promise<FolderEstimate> {
  const root = folderPath(folder);
  const empty: FolderEstimate = { folder, files: 0, byKind: {}, skipped: {}, seconds: 0, laterSeconds: 0 };
  if (!isFolder(root) || !isReadable(root)) return { ...empty, readable: false };
  signal?.throwIfAborted();
  const report = await crawl([root], options, { helper });
  signal?.throwIfAborted();
  const facts = await lookUpFacts(report.candidates, helper, signal);
  const groups = estimatesBySubfolder(report.candidates, root, options, costs, facts);
  const total = [...groups.values()].reduce(addEstimates, emptyEstimate());
  const out = toFolderEstimate(folder, total, report.skipped, options.code);
  out.subfolders = [...groups]
    .filter(([key]) => key !== root)
    .sort((a, b) => b[1].seconds - a[1].seconds || (a[0] < b[0] ? -1 : 1))
    .slice(0, 500)
    .map(([key, part]) => toFolderEstimate(key, part, {}, options.code));
  return out;
}
