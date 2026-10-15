// Which folders Dig Up searches: the folders you chose, minus the folders you skipped inside them (DigUp:
// FolderSelection.swift, AppController.applyFolders, IndexOptions.extensions). Pure: no @raycast/api, and file system
// access (symlink resolution) comes in as a function (test/results.test.ts).

import { homedir } from "node:os";
import type { FolderEstimate } from "../../engine/api";
import { baseName, dirName, roughBytes, roughDuration } from "./format";

/** The folders DigUp offers first (Onboarding, Add Folders): those of them that exist and aren't searched yet. */
export const USUAL_FOLDERS = ["Desktop", "Documents", "Downloads", "Pictures", "Movies", "Music"] as const;

export function isInside(path: string, folder: string): boolean {
  return path.startsWith(folder.endsWith("/") ? folder : `${folder}/`);
}

export function parentOf(path: string): string {
  return dirName(path);
}

function unique(paths: string[]): string[] {
  return [...new Set(paths)];
}

/** Whether `path` (a folder or a file) is searched. A skip applies inside the chosen folders that contain it. */
export function isSearched(path: string, folders: string[], skipped: string[]): boolean {
  return folders.some(
    (folder) =>
      (path === folder || isInside(path, folder)) &&
      !skipped.some((skip) => isInside(skip, folder) && (path === skip || isInside(path, skip))),
  );
}

export type Mark = "on" | "mixed" | "off";

/** The folders you chose and the ones you skipped inside them: DigUp's FolderSelection. */
export class FolderSelection {
  chosen: string[];
  skipped: string[];

  constructor(chosen: string[] = [], skipped: string[] = []) {
    this.chosen = unique(chosen);
    this.skipped = unique(skipped);
  }

  isSearched(path: string): boolean {
    return isSearched(path, this.chosen, this.skipped);
  }

  /** The closest chosen folder that searches `path`. */
  searchedAs(path: string): string | null {
    const covering = this.chosen.filter(
      (folder) => (path === folder || isInside(path, folder)) && isSearched(path, [folder], this.skipped),
    );
    return covering.reduce<string | null>((best, f) => (best === null || f.length > best.length ? f : best), null);
  }

  /** What the indexer gets: the chosen folders, without those another one already searches whole. */
  get folders(): string[] {
    const all = unique(this.chosen);
    return all.filter(
      (folder) =>
        !all.some((other) => other !== folder && isInside(folder, other) && isSearched(folder, [other], this.skipped)),
    );
  }

  /** The skips that leave something out (inside a folder that's searched). */
  get effectiveSkips(): string[] {
    const folders = this.folders;
    return this.skipped.filter((skip) => folders.some((folder) => isInside(skip, folder)));
  }

  mark(folder: string): Mark {
    if (this.isSearched(folder)) {
      return this.skipped.some((s) => parentOf(s) === folder && !this.isSearched(s)) ? "mixed" : "on";
    }
    return this.chosen.some((c) => parentOf(c) === folder) ? "mixed" : "off";
  }

  /** Checks or unchecks a folder and its subfolders: all of it, or none of it. */
  setFolder(folder: string, on: boolean): void {
    this.skipped = this.skipped.filter((s) => parentOf(s) !== folder);
    this.chosen = this.chosen.filter((c) => parentOf(c) !== folder);
    this.setSubfolder(folder, on);
  }

  /** Checks or unchecks one folder, leaving the choices inside it as they are. */
  setSubfolder(folder: string, on: boolean): void {
    if (on) {
      this.skipped = this.skipped.filter((s) => s !== folder);
      if (!this.isSearched(folder)) this.chosen.push(folder);
    } else {
      this.chosen = this.chosen.filter((c) => c !== folder);
      if (this.isSearched(folder)) this.skipped.push(folder);
    }
  }

  unskip(folder: string): void {
    this.skipped = this.skipped.filter((s) => s !== folder);
  }
}

/** "~/Documents/" → "/Users/me/Documents": expands "~", trims spaces and trailing slashes. */
export function expandTilde(path: string, home: string = homedir()): string {
  const trimmed = path.trim();
  const expanded = trimmed === "~" ? home : trimmed.startsWith("~/") ? `${home}${trimmed.slice(1)}` : trimmed;
  return expanded.length > 1 ? expanded.replace(/\/+$/, "") : expanded;
}

export interface Normalizer {
  /** Resolves symlinks (fs.realpathSync); identity in tests. A path that can't be resolved is returned as is. */
  resolve: (path: string) => string;
  home?: string;
}

/** Expands "~", resolves symlinks, drops blanks and repeats. */
export function normalizeFolders(paths: string[], n: Normalizer): string[] {
  return unique(
    paths
      .filter((p) => p.trim() !== "")
      .map((p) => n.resolve(expandTilde(p, n.home)))
      .filter((p) => p !== ""),
  );
}

export interface FolderLists {
  chosen: string[];
  skipped: string[];
}

export interface Change extends FolderLists {
  /** What became of the folders picked, when it wasn't what was asked ("searched already"). */
  notes: string[];
}

/** Adds folders: one already searched stays as it is and a note says as part of what. */
export function addFolders(current: FolderLists, picked: string[], n: Normalizer): Change {
  const selection = new FolderSelection(current.chosen, current.skipped);
  const notes: string[] = [];
  for (const folder of normalizeFolders(picked, n)) {
    if (selection.chosen.includes(folder)) {
      notes.push(`“${baseName(folder)}” is searched already.`);
    } else if (selection.isSearched(folder)) {
      // Inside a chosen folder and not skipped.
      const by = selection.searchedAs(folder);
      notes.push(
        `“${baseName(folder)}” is searched already${by && by !== folder ? `, as part of “${baseName(by)}”.` : "."}`,
      );
    } else {
      selection.setFolder(folder, true);
    }
  }
  return finish(selection, notes);
}

/** Stops searching a folder. The skips inside it that no other folder covers go with it (nothing left to skip). */
export function removeFolder(current: FolderLists, folder: string): Change {
  const selection = new FolderSelection(current.chosen, current.skipped);
  selection.chosen = selection.chosen.filter((c) => c !== folder);
  return finish(selection, []);
}

/** Skips subfolders of the folders searched. A pick that isn't inside one says so. */
export function skipFolders(current: FolderLists, picked: string[], n: Normalizer): Change {
  const selection = new FolderSelection(current.chosen, current.skipped);
  const notes: string[] = [];
  for (const folder of normalizeFolders(picked, n)) {
    if (selection.chosen.includes(folder)) {
      selection.setFolder(folder, false);
    } else if (selection.isSearched(folder)) {
      selection.setSubfolder(folder, false);
    } else {
      notes.push(`“${baseName(folder)}” isn't searched anyway.`);
    }
  }
  return finish(selection, notes);
}

export function unskipFolder(current: FolderLists, folder: string): Change {
  const selection = new FolderSelection(current.chosen, current.skipped);
  selection.unskip(folder);
  return finish(selection, []);
}

/** The full arrays to POST: folders without those another one covers, skips that still leave something out. */
function finish(selection: FolderSelection, notes: string[]): Change {
  return { chosen: selection.folders, skipped: selection.effectiveSkips, notes };
}

/** DigUp's IndexOptions.extensions: "heic, .txt *.md" → ["heic", "md", "txt"] (lowercase, no dot or star). */
export function parseExtensions(text: string): string[] {
  const out = new Set<string>();
  for (const word of text.split(/[,\s]+/u)) {
    const ext = word.replace(/^[*.]+/u, "").toLowerCase();
    if (ext) out.add(ext);
  }
  return [...out].sort();
}

/** "heic, md, txt": the types as shown in the field. */
export function extensionsText(extensions: string[]): string {
  return extensions.join(", ");
}

/** How many files a folder holds, summed over its kinds. */
export function sumKinds(byKind: Partial<Record<string, number>>): number {
  return Object.values(byKind).reduce<number>((sum, n) => sum + (n ?? 0), 0);
}

/**
 * The line under the add picker (DigUp: AddFolders.swift summary): what adding the picked folders costs, from their
 * estimates (undefined: still being looked at; "failed": couldn't be looked at). DigUp's "Check the folders to add"
 * says "Choose": there are no checkboxes here.
 */
export function addSummary(estimates: Array<FolderEstimate | "failed" | undefined>, code: boolean): string {
  if (estimates.length === 0) return "Choose the folders to add";
  if (estimates.some((estimate) => estimate === undefined)) return "Looking at the folders…";
  const known = estimates.filter(
    (estimate): estimate is FolderEstimate => estimate !== undefined && estimate !== "failed",
  );
  if (known.length === 0) return "Couldn't look inside them; they can still be searched.";
  const seconds = known.reduce((sum, estimate) => sum + estimate.seconds, 0);
  const time = seconds < 1 ? "under a second" : `about ${roughDuration(seconds)}`;
  if (code) return `Adds ${time} of indexing and ${roughBytes(known.reduce((sum, e) => sum + (e.bytes ?? 0), 0))}`;
  const later = known.reduce((sum, estimate) => sum + estimate.laterSeconds, 0);
  return `Adds ${time} of indexing` + (later >= 30 ? `, and ${roughDuration(later)} more for long files` : "");
}
