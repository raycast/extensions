// Words for what the index is doing: DigUp's AppModel.statusLine, activityBadge, meaningUnavailable, resultsCaveat and
// the model download line. Pure: no @raycast/api (test/results.test.ts).

import type { FileKind } from "../../engine/types";
import type { FolderSummary, IndexCounts, KindCounts, SetupState, Status } from "../../engine/api";
import { formatCount, plural, shortTime, timeLeft } from "./format";

export const MODEL_SIZE = "865 MB";

/** Files in the index that search can find (a long file still being read is searchable too). */
export function searchable(counts: KindCounts): number {
  return counts.done + counts.partial;
}

export function percent(done: number, total: number): number {
  return total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0;
}

export function hasFolders(status: Pick<Status, "folders">): boolean {
  return status.folders.length > 0;
}

export function hasCode(status: Pick<Status, "codeFolders">): boolean {
  return status.codeFolders.length > 0;
}

/** Nothing chosen at all: neither folders nor code folders. */
export function nothingChosen(status: Pick<Status, "folders" | "codeFolders">): boolean {
  return !hasFolders(status) && !hasCode(status);
}

/** The model and llama.cpp are in place. */
export function setupReady(status: Pick<Status, "setup">): boolean {
  return status.setup.state === "ready";
}

export function setupDownloading(setup: SetupState): boolean {
  return setup.state === "downloading" || setup.state === "verifying";
}

const HELD_TEXT: Record<NonNullable<Status["held"]>, string> = {
  paused: "paused",
  "on battery": "on battery",
  "Low Power Mode": "Low Power Mode",
  "Mac is warm": "Mac is warm",
  "outside index hours": "outside index hours",
  setup: "waiting for setup",
};

export function heldText(held: Status["held"]): string | null {
  return held ? HELD_TEXT[held] : null;
}

/**
 * Outside the index hours, when indexing starts again: DigUp's "indexing from 1:00 AM", or "outside index hours" when
 * the daemon doesn't say when. Null otherwise; a pause wins over the hours, as in DigUp.
 */
export function hoursText(status: Pick<Status, "held" | "heldUntil">): string | null {
  if (status.held !== "outside index hours") return null;
  return status.heldUntil ? `indexing from ${shortTime(status.heldUntil)}` : HELD_TEXT[status.held];
}

/** Why indexing waits, for the status lines: the hours with their time, else the reason's words. */
function holdReason(status: Pick<Status, "held" | "heldUntil">): string | null {
  return hoursText(status) ?? heldText(status.held);
}

function counted(n: number, one: string, many: string): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** What a download is of: llama.cpp's server, or the model (its two files count as one). */
export function downloadName(what: string): string {
  return /llama/i.test(what) && !/gguf/i.test(what) ? "llama.cpp" : "the model";
}

/**
 * The download as DigUp's status line says it: "Downloading the model · 42%", "Checking the model download…",
 * "⚠︎ The model download stopped"; "The model isn't downloaded yet" while it hasn't started.
 */
export function setupLine(setup: SetupState): string | null {
  switch (setup.state) {
    case "ready":
      return null;
    case "downloading":
      if (setup.waiting) {
        return `${downloadName(setup.what) === "llama.cpp" ? "llama.cpp" : "Model"} download: waiting for the network`;
      }
      return setup.total > 0
        ? `Downloading ${downloadName(setup.what)} · ${percent(setup.bytes, setup.total)}%`
        : `Preparing ${downloadName(setup.what)} download…`;
    case "verifying":
      return `Checking ${downloadName(setup.what) === "llama.cpp" ? "the llama.cpp" : "the model"} download…`;
    case "failed":
      return "Setup download stopped";
    case "missing":
      return setup.missing.every((part) => part === "llama")
        ? "Search engine needs to be downloaded"
        : setup.missing.includes("llama")
          ? "Model and search engine need to be downloaded"
          : "Search model needs to be downloaded";
  }
}

/** DigUp's text while a network problem is waited out (whatever the problem was; the download resumes by itself). */
const WAITING_FOR_NETWORK = "Waiting for the network…";

/**
 * DigUp's ModelDownload.progressText: "42% · about 1 min left", "Checking the download…", "Waiting for the network…",
 * the failure's message.
 */
export function setupProgressText(setup: SetupState, secondsLeft?: number | null): string | null {
  switch (setup.state) {
    case "ready":
      return null;
    case "downloading": {
      if (setup.waiting) return WAITING_FOR_NETWORK;
      const pct = `${percent(setup.bytes, setup.total)}%`;
      return secondsLeft != null && secondsLeft > 0 ? `${pct} · ${timeLeft(secondsLeft)}` : pct;
    }
    case "verifying":
      return "Checking the download…";
    case "failed":
      return setup.error;
    case "missing":
      return "Not downloaded yet";
  }
}

/**
 * Seconds left in a download: from the daemon's measured rate, else `measured` (the client's own, between polls).
 * Null while it waits for the network or before there's a rate, as DigUp's ModelDownload.secondsLeft.
 */
export function downloadSecondsLeft(setup: SetupState, measured: number | null = null): number | null {
  if (setup.state !== "downloading" || setup.waiting) return null;
  const rate = setup.bytesPerSecond ?? measured;
  return rate && rate > 0 ? Math.max(0, setup.total - setup.bytes) / rate : null;
}

/** Bytes per second between two samples of a download, or null when it can't be told. */
export function downloadRate(
  before: { bytes: number; at: number } | null,
  after: { bytes: number; at: number },
): number | null {
  if (!before || after.at <= before.at || after.bytes < before.bytes) return null;
  return ((after.bytes - before.bytes) * 1000) / (after.at - before.at);
}

/** 0…1 for a progress ring while the model downloads, else null. */
export function setupProgress(setup: SetupState): number | null {
  return setup.state === "downloading" && setup.total > 0 ? Math.min(1, setup.bytes / setup.total) : null;
}

/** 0…1 for progress while an indexing pass runs, else null. */
export function indexProgress(status: Status): number | null {
  const a = status.activity;
  if (a.state !== "indexing" || a.total <= 0) return null;
  const counts = a.index === "code" ? status.code?.total : status.main.total;
  if (a.pass === "first" && counts && counts.files > 0) {
    return Math.min(1, Math.max(0, (counts.files - counts.pending) / counts.files));
  }
  return Math.min(1, a.done / a.total);
}

/** The status line before the engine has answered: DigUp's `Starting…`, or that it didn't start. */
export function startingLine(failed: unknown): string {
  return failed ? "⚠︎ Dig Up's engine isn't running" : "Starting…";
}

/** The line for code search alone (code folders, no folders to search): the code index's own counts. */
function codeOnlyLine(status: Status): string {
  const total = status.code?.total;
  const pending = total?.pending ?? 0;
  const waiting = `${counted(pending, "code file", "code files")} waiting`;
  const reason = holdReason(status);
  if (pending > 0 && status.held === "paused") return `Paused · ${waiting}`;
  if (pending > 0 && reason) return `${waiting} · ${reason}`;
  if (pending > 0) return `${waiting} to be indexed`;
  const done = `${counted(total ? searchable(total) : 0, "code file", "code files")} indexed`;
  return status.held === "paused" ? `${done} · paused` : done;
}

/** One line for the menu and the windows: what the index is doing (DigUp: AppModel.statusLine). */
export function statusLine(status: Status): string {
  if (status.setup.state !== "ready") return setupLine(status.setup) as string;
  if (nothingChosen(status)) return "No folders chosen yet";
  const a = status.activity;
  const main = status.main;
  switch (a.state) {
    case "starting":
      return "Starting…";
    case "failed":
      // The engine stopped ("Can't open the index", "Indexing stopped"); the daemon tries again by itself. A lastError
      // while it works is a file's or a passing one: the views show it on a line of its own.
      return `⚠︎ ${a.problem}`;
    case "syncing":
      return "Checking folders…";
    case "indexing": {
      const pct = Math.floor((indexProgress(status) ?? 0) * 100);
      if (a.index === "code") return `Indexing code ${pct}% · ${formatCount(a.done)} of ${formatCount(a.total)}`;
      if (a.pass === "rest") {
        const files = main.unfinished.files;
        const which = files > 0 ? `${formatCount(files)} long ${files === 1 ? "file" : "files"}` : "long files";
        return `Reading the rest of ${which} · ${pct}%`;
      }
      return a.pass === "first" && main.total.files > 0
        ? `Indexing ${pct}% · ${formatCount(searchable(main.total))} searchable`
        : `Indexing ${pct}% · ${formatCount(a.done)} of ${formatCount(a.total)}`;
    }
    case "idle":
      break;
  }
  if (!hasFolders(status)) return codeOnlyLine(status);
  // The files the main index waits on; code waits on its own and has its own line while it indexes.
  const pending = main.total.pending;
  const waiting = `${counted(pending, "file", "files")} waiting`;
  const done = `${counted(searchable(main.total), "file", "files")} indexed`;
  const held = status.held;
  if (pending > 0 && held === "paused") return `Paused · ${waiting}`;
  // Outside the set hours: what waits, or what's in, and when indexing starts again (before the long files).
  const hours = hoursText(status);
  if (hours) return `${pending > 0 ? waiting : done} · ${hours}`;
  if (pending > 0 && held) return `${waiting} · ${HELD_TEXT[held]}`;
  if (pending > 0) return `${waiting} to be indexed`;
  const unfinished = main.unfinished.files;
  if (unfinished > 0) {
    const rest = `${counted(unfinished, "long file", "long files")} to finish`;
    if (held === "paused") return `Paused · ${rest}`;
    // DigUp names only power and schedule holds here; with nothing waiting, setup isn't a reason.
    if (held && held !== "setup") return `${rest} · ${HELD_TEXT[held]}`;
  }
  return held === "paused" ? `${done} · paused` : done;
}

/**
 * The menu's second line (DigUp: MenuStatusView.detail): the download's progress, or where Dig Up looks, as in
 * "In Desktop, Documents (not connected), Pictures (no access)". `secondsLeft` defaults to the daemon's measure.
 */
export function statusDetail(
  status: Status,
  names: (path: string) => string,
  secondsLeft?: number | null,
): string | null {
  if (setupDownloading(status.setup) || status.setup.state === "failed") {
    return setupProgressText(status.setup, secondsLeft === undefined ? downloadSecondsLeft(status.setup) : secondsLeft);
  }
  if (nothingChosen(status)) return "Pick the folders it should search.";
  const marked = (folders: string[], missing: string[] = [], unreadable: string[] = []) =>
    folders
      .map(
        (folder) =>
          names(folder) +
          (missing.includes(folder) ? " (not connected)" : unreadable.includes(folder) ? " (no access)" : ""),
      )
      .join(", ");
  const parts: string[] = [];
  if (status.folders.length > 0) {
    parts.push(`In ${marked(status.folders, status.missingFolders, status.unreadableFolders)}`);
  }
  if (status.codeFolders.length > 0) {
    parts.push(`code in ${marked(status.codeFolders, status.codeMissingFolders, status.codeUnreadableFolders)}`);
  }
  return parts.join("; ");
}

/** "Desktop, Documents and Downloads", or "5 folders" for more than three (DigUp's search home). */
export function foldersText(names: string[]): string {
  if (names.length > 3) return `${names.length} folders`;
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** 0…1 for a progress bar: the model download, then an indexing pass. */
export function progressOf(status: Status): number | null {
  return setupProgress(status.setup) ?? indexProgress(status);
}

/** A few words for the search bar while results may be incomplete: "Indexing 42%". */
export function activityBadge(status: Status): string | null {
  if (status.setup.state === "downloading") return setupLine(status.setup);
  const a = status.activity;
  if (a.state === "indexing" && a.total > 0) return `Indexing ${Math.floor((indexProgress(status) ?? 0) * 100)}%`;
  if (status.held === "paused" && status.main.total.pending > 0) return "Indexing paused";
  return null;
}

/** Why meaning search can't run yet (words still match), or null. */
export function meaningUnavailable(status: Status): string | null {
  const setup = status.setup;
  if (setup.state === "ready") return null;
  if (setup.state === "downloading") {
    return `Matching file names · ${setupLine(setup)}`;
  }
  return `Matching file names · ${setupLine(setup)}`;
}

/** Why results may be incomplete right now, or null. */
export function resultsCaveat(status: Status): string | null {
  const unavailable = meaningUnavailable(status);
  if (unavailable) return unavailable;
  const a = status.activity;
  if (a.state === "indexing" && a.total > 0) {
    return `Still indexing (${Math.floor((indexProgress(status) ?? 0) * 100)}%): some files aren't in yet`;
  }
  const pending = status.main.total.pending;
  if (pending > 0) return `${formatCount(pending)} ${pending === 1 ? "file isn't" : "files aren't"} indexed yet`;
  return null;
}

/** "Still reading code (42%): some isn't in yet" for a code search while code indexes, else null. */
export function codeCaveat(status: Status): string | null {
  const a = status.activity;
  if (a.state === "indexing" && a.index === "code" && a.total > 0) {
    return `Still reading code (${Math.floor((indexProgress(status) ?? 0) * 100)}%): some isn't in yet`;
  }
  return null;
}

const NOUNS: Record<FileKind, [string, string]> = {
  screenshot: ["screenshot", "screenshots"],
  image: ["image", "images"],
  pdf: ["PDF", "PDFs"],
  doc: ["document", "documents"],
  audio: ["audio file", "audio files"],
  video: ["video", "videos"],
  code: ["code file", "code files"],
};

const KIND_ORDER: FileKind[] = ["screenshot", "image", "pdf", "doc", "audio", "video", "code"];

/** "Screenshots", "PDFs", "Audio files": a kind's plural as a label. */
export function kindLabel(kind: FileKind): string {
  const noun = NOUNS[kind][1];
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

/** "136 screenshots, 104 images, 25 PDFs" (DigUp's KindCounts.description). */
export function kindCountsText(counts: Partial<Record<FileKind, number>>, separator = ", "): string {
  return KIND_ORDER.filter((kind) => (counts[kind] ?? 0) > 0)
    .map((kind) => counted(counts[kind] as number, NOUNS[kind][0], NOUNS[kind][1]))
    .join(separator);
}

/** The counts of an index for Settings' line: "812 of 840 files searchable · 12 waiting · 2 long files to finish". */
export function indexSummary(counts: IndexCounts | null, noun = "files"): string | null {
  if (!counts) return null;
  const t = counts.total;
  const parts = [`${formatCount(searchable(t))} of ${formatCount(t.files)} ${noun} searchable`];
  if (t.pending > 0) parts.push(`${formatCount(t.pending)} waiting`);
  if (counts.unfinished.files > 0) parts.push(`${plural(counts.unfinished.files, "long file")} to finish`);
  if (t.failed > 0) parts.push(`${formatCount(t.failed)} couldn't be read`);
  return parts.join(" · ");
}

/** The short title next to the menu bar icon, only while a pass runs: "42%". */
export function menuBarTitle(status: Status): string | undefined {
  const a = status.activity;
  if (a.state === "indexing" && a.total > 0) return `${Math.floor((indexProgress(status) ?? 0) * 100)}%`;
  if (status.setup.state === "downloading") return `${percent(status.setup.bytes, status.setup.total)}%`;
  return undefined;
}

/**
 * Whether the status wants a fast refresh: a pass, a download, the engine starting, or (`setupAsked`) a download just
 * asked for that hasn't begun. A failed engine isn't: the daemon tries again by itself, from 5 s up to 10 min apart.
 */
export function isBusy(status: Status, setupAsked = false): boolean {
  const activity = status.activity.state;
  return (
    (activity !== "idle" && activity !== "failed") ||
    setupDownloading(status.setup) ||
    (setupAsked && status.setup.state === "missing")
  );
}

export function secondsLeftText(seconds: number | null): string | null {
  return seconds === null || seconds <= 0 ? null : timeLeft(seconds);
}

// MARK: Folder rows (DigUp: SettingsWindow.swift FolderStatusRow)

/** Why a chosen folder is skipped, its files kept: "missing" (not there now: an unplugged drive) or "unreadable"
 *  (macOS doesn't let Raycast read it). */
export type FolderTrouble = "missing" | "unreadable";

/** POST /access's words for a folder that isn't there (or isn't a folder any more): not a matter of permissions. */
const NOT_THERE = new Set(["it isn't there", "it isn't a folder"]);

/** What a POST /access reply says about its folder. */
export function accessTrouble(reply: { readable: boolean; error?: string } | undefined): FolderTrouble | null {
  if (!reply || reply.readable) return null;
  return reply.error && NOT_THERE.has(reply.error) ? "missing" : "unreadable";
}

type FolderLists = Pick<
  Status,
  "missingFolders" | "unreadableFolders" | "codeMissingFolders" | "codeUnreadableFolders"
>;

/**
 * A chosen folder's trouble (`code`: a code folder's), from the daemon's status and the view's POST /access reply. The
 * status is polled, so its word wins on "missing" (a drive plugged back in shows at once); "unreadable" is either's,
 * since the status learns it from a pass and /access asks macOS now.
 */
export function folderTrouble(
  folder: string,
  code: boolean,
  status: FolderLists | null,
  access?: { readable: boolean; error?: string },
): FolderTrouble | null {
  const missing = code ? status?.codeMissingFolders : status?.missingFolders;
  const unreadable = code ? status?.codeUnreadableFolders : status?.unreadableFolders;
  const asked = accessTrouble(access);
  if (missing ? missing.includes(folder) : asked === "missing") return "missing";
  if (unreadable?.includes(folder) || asked === "unreadable") return "unreadable";
  return null;
}

/** DigUp's orange capsule on a folder row. */
export function troubleTag(trouble: FolderTrouble): "Not connected" | "No access" {
  return trouble === "missing" ? "Not connected" : "No access";
}

/** What the daemon counts under `folder` (`code`: in the code index), if it sent that. */
export function summaryOf(
  status: Pick<Status, "folderSummaries" | "codeFolderSummaries"> | null,
  folder: string,
  code: boolean,
): FolderSummary | undefined {
  return (code ? status?.codeFolderSummaries : status?.folderSummaries)?.find((summary) => summary.folder === folder);
}

/** A folder row's figure: "1,204 of 1,300 indexed", or "Kept for when it's back" while it's skipped. */
export function folderIndexedText(summary: FolderSummary, trouble: FolderTrouble | null = null): string {
  return trouble || summary.missing || summary.unreadable
    ? "Kept for when it's back"
    : `${formatCount(summary.indexed)} of ${formatCount(summary.files)} indexed`;
}

/** Under it: "8 waiting · 2 long files to finish · 5 skipped · 3 couldn't be read"; empty when there's none. */
export function folderStatesText(summary: FolderSummary): string {
  return [
    summary.pending > 0 ? `${formatCount(summary.pending)} waiting` : null,
    summary.unfinished > 0 ? `${counted(summary.unfinished, "long file", "long files")} to finish` : null,
    summary.skipped > 0 ? `${formatCount(summary.skipped)} skipped` : null,
    summary.failed > 0 ? `${formatCount(summary.failed)} couldn't be read` : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
}
