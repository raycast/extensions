// A search hit as the commands show it: name, folder, place badge, reason, details, and the grouped result set.
// Pure: no @raycast/api (test/results.test.ts). Ports DigUp's Results.swift and Moments.swift.

import { strongCount, type FileKind, type Hit, type SegmentKind } from "../../engine/types";
import { baseName, bytes, clock, dirName, foundWordsOf, formatCount, languageOf, shortDate, tildePath } from "./format";

/** How results are grouped in the list, and the kind filters in the dropdowns. */
export type ResultGroupKind = "screenshots" | "images" | "documents" | "video" | "audio" | "code";

/** The kinds the main index holds, in the order of DigUp's filter chips. */
export const FILE_GROUPS: readonly ResultGroupKind[] = ["screenshots", "images", "documents", "video", "audio"];

export const GROUP_TITLES: Record<ResultGroupKind, string> = {
  screenshots: "Screenshots",
  images: "Images",
  documents: "Documents",
  video: "Video",
  audio: "Audio",
  code: "Code",
};

export const GROUP_KINDS: Record<ResultGroupKind, FileKind[]> = {
  screenshots: ["screenshot"],
  images: ["image"],
  documents: ["pdf", "doc"],
  video: ["video"],
  audio: ["audio"],
  code: ["code"],
};

export const KIND_TITLES: Record<FileKind, string> = {
  screenshot: "Screenshot",
  image: "Image",
  pdf: "PDF",
  doc: "Document",
  audio: "Audio",
  video: "Video",
  code: "Code",
};

export function groupOf(kind: FileKind): ResultGroupKind {
  switch (kind) {
    case "screenshot":
      return "screenshots";
    case "image":
      return "images";
    case "pdf":
    case "doc":
      return "documents";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "code":
      return "code";
  }
}

/** DigUp's panel shows six rows per group; code, a group of its own, gets three times that. */
export const ROWS_PER_GROUP = 6;

export interface ResultRow {
  /** The file's path. */
  id: string;
  path: string;
  name: string;
  /** The name with a left-to-right mark first, so a name that starts in Arabic still reads as Finder shows it. */
  title: string;
  /** "~/Downloads/Screenshots"; for code the path inside its repo ("billing-service/billing"). */
  folder: string;
  /** The folder's absolute path (for Show in Finder and the folder link). */
  folderPath: string;
  kind: FileKind;
  group: ResultGroupKind;
  segment: SegmentKind;
  segmentId: number;
  /** PDF page, seconds into audio or video, chunk number, or a stretch of code's first line. */
  loc: number | null;
  locEnd: number | null;
  /** Code: the line to open at. */
  focus: number | null;
  /** Matched words are wrapped in « ». */
  excerpt: string | null;
  matchedMeaning: boolean;
  matchedWords: boolean;
  /** Seconds since 1970. */
  modified: number;
  size: number;
  info: Record<string, string>;
  /** The query's words: what previews highlight. */
  terms: string[];
  foundWords: string[];
  /** The page or moment that matched as a badge: "p. 3", "0:06", "♪ 0:25", "L12–40", "cell 3". */
  place: string | null;
  /** "lines 12–40", "cell 3". */
  span: string | null;
  /** "Matches the frame at 0:06". */
  reason: string;
  /** "Screenshot · Oct 1, 2026 · 1440 × 900 · 2.1 MB". */
  details: string;
  /** PDF page that matched (1-based). */
  page: number | null;
  /** Seconds into a recording where the match starts. */
  moment: number | null;
  /** Where opening should go when it isn't the start: a page after the first, or a moment ≥ 1 s. */
  jump: string | null;
  codeLine: number;
  duration: number | null;
}

function int(text: string | undefined): number | null {
  return text !== undefined && /^-?\d+$/.test(text.trim()) ? Number(text) : null;
}

function double(text: string | undefined): number | null {
  if (text === undefined || text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function spanOf(segment: SegmentKind, loc: number | null, locEnd: number | null): string | null {
  if (loc === null) return null;
  const first = Math.trunc(loc);
  const last = Math.trunc(locEnd ?? loc);
  if (segment === "lines") return first === last ? `line ${first}` : `lines ${first}–${last}`;
  if (segment === "cells") return first === last ? `cell ${first}` : `cells ${first}–${last}`;
  return null;
}

function placeOf(kind: FileKind, segment: SegmentKind, loc: number | null, locEnd: number | null): string | null {
  if (loc === null) return null;
  switch (segment) {
    case "page":
    case "page_image":
      return `p. ${Math.trunc(loc)}`;
    case "frame":
      return clock(loc);
    case "audio":
      return kind === "video" ? `♪ ${clock(loc)}` : clock(loc);
    case "lines": {
      const first = Math.trunc(loc);
      const last = Math.trunc(locEnd ?? loc);
      return first === last ? `L${first}` : `L${first}–${last}`;
    }
    case "cells": {
      const first = Math.trunc(loc);
      const last = Math.trunc(locEnd ?? loc);
      return first === last ? `cell ${first}` : `cells ${first}–${last}`;
    }
    default:
      return null;
  }
}

function reasonOf(row: {
  kind: FileKind;
  segment: SegmentKind;
  loc: number | null;
  span: string | null;
  matchedMeaning: boolean;
  matchedWords: boolean;
}): string {
  if (!row.matchedMeaning) return row.matchedWords ? "Has your words" : "Matches its name";
  const at = row.loc === null ? "" : clock(row.loc);
  const page = row.loc === null ? "a page" : `page ${Math.trunc(row.loc)}`;
  switch (row.segment) {
    case "image":
      return row.kind === "screenshot" ? "Matches what's on screen" : "Matches the picture";
    case "ocr":
      return "Matches the text in it";
    case "frame":
      return `Matches the frame at ${at}`;
    case "audio":
      return row.kind === "video" ? `Matches the sound at ${at}` : `Matches what's heard at ${at}`;
    case "page":
      return `Matches the text on ${page}`;
    case "page_image":
      return `Matches ${page}`;
    case "chunk":
      return "Matches its text";
    case "name":
      return "Matches its name";
    case "lines":
    case "cells":
      return `Matches ${row.span ?? "the code"}`;
  }
}

function detailsOf(row: {
  kind: FileKind;
  path: string;
  modified: number;
  size: number;
  info: Record<string, string>;
  duration: number | null;
}): string {
  const { info } = row;
  if (row.kind === "code") {
    const parts = [languageOf(row.path)];
    const cells = int(info.cells);
    const lines = int(info.lines);
    if (cells !== null) parts.push(cells === 1 ? "1 cell" : `${cells} cells`);
    else if (lines !== null) parts.push(lines === 1 ? "1 line" : `${formatCount(lines)} lines`);
    parts.push(shortDate(row.modified));
    if (row.size > 0) parts.push(bytes(row.size));
    return parts.join(" · ");
  }
  const parts = [KIND_TITLES[row.kind], shortDate(row.modified)];
  if (info.width && info.height) parts.push(`${info.width} × ${info.height}`);
  // A long file still being read: what isn't read yet can't match.
  const readTo = int(info.read_to);
  const pages = int(info.pages);
  if (pages !== null) {
    parts.push((pages === 1 ? "1 page" : `${pages} pages`) + (readTo !== null ? `, ${readTo} read so far` : ""));
  } else if (readTo !== null) {
    parts.push("partly read so far");
  }
  if (row.duration !== null) parts.push(clock(row.duration));
  if (row.size > 0) parts.push(bytes(row.size));
  return parts.join(" · ");
}

/** The folder shown under a name: code says where it is in its repo; the rest a tilde path. */
export function folderLabel(hit: Pick<Hit, "path" | "kind" | "info">, home?: string): string {
  const folder = dirName(hit.path);
  const repo = hit.info?.repo;
  if (hit.kind === "code" && repo && hit.path.startsWith(`${repo}/`)) {
    const parent = dirName(repo);
    return folder.slice(parent === "/" ? 1 : parent.length + 1);
  }
  return tildePath(folder, home);
}

/** DigUp's ResultRow.init(hit, terms:). `home` is for tests; it defaults to the user's home folder. */
export function makeRow(hit: Hit, terms: string[] = [], home?: string): ResultRow {
  const loc = hit.loc ?? null;
  const locEnd = hit.locEnd ?? null;
  const excerpt = hit.excerpt ? hit.excerpt : null;
  const info = hit.info ?? {};
  const matchedMeaning = (hit.z ?? 0) >= 2;
  const matchedWords = hit.keywordRank !== null && hit.keywordRank !== undefined;
  const span = spanOf(hit.segment, loc, locEnd);
  const place = placeOf(hit.kind, hit.segment, loc, locEnd);
  const duration = double(info.duration);
  const page =
    hit.kind === "pdf" && (hit.segment === "page" || hit.segment === "page_image") && loc !== null
      ? Math.trunc(loc)
      : null;
  const moment =
    (hit.kind === "video" || hit.kind === "audio") && (hit.segment === "frame" || hit.segment === "audio") ? loc : null;
  let jump: string | null = null;
  if (page !== null && page > 1) jump = place;
  else if (moment !== null && moment >= 1) jump = place;
  return {
    id: hit.path,
    path: hit.path,
    name: baseName(hit.path),
    title: `‎${baseName(hit.path)}`,
    folder: folderLabel(hit, home),
    folderPath: dirName(hit.path),
    kind: hit.kind,
    group: groupOf(hit.kind),
    segment: hit.segment,
    segmentId: hit.segmentId,
    loc,
    locEnd,
    focus: hit.focus ?? null,
    excerpt,
    matchedMeaning,
    matchedWords,
    modified: hit.modified,
    size: hit.size,
    info,
    terms,
    foundWords: foundWordsOf(excerpt),
    place,
    span,
    reason: reasonOf({ kind: hit.kind, segment: hit.segment, loc, span, matchedMeaning, matchedWords }),
    details: detailsOf({ kind: hit.kind, path: hit.path, modified: hit.modified, size: hit.size, info, duration }),
    page,
    moment,
    jump,
    codeLine: hit.segment === "lines" ? Math.max(1, Math.trunc(hit.focus ?? loc ?? 1)) : 1,
    duration,
  };
}

/** The words the PDF's page is searched for (matched words first, then the query's), for POST /open-pdf. */
export function searchWords(row: ResultRow): string[] {
  return [...new Set([...row.foundWords, ...row.terms])];
}

export interface OpenContext {
  /** The name of the editor code opens in; null: the file's default app. */
  editor?: string | null;
  /** The app a recording opens in can be told the moment (QuickTime Player or IINA). */
  jumpsToMoments?: boolean;
}

/**
 * The primary action's title: "Open in Zed at line 12", "Open at 0:06" (when the player can start there; a video's
 * sound too, without the badge's ♪), "Open at p. 3" (the PDF app gets words from that page to search for), else "Open".
 * Raycast has no footer to name the place, so the title does.
 */
export function openTitle(row: ResultRow, context: OpenContext = {}): string {
  if (row.kind === "code") {
    if (!context.editor) return "Open";
    return `Open in ${context.editor}` + (row.segment === "lines" ? ` at line ${row.codeLine}` : "");
  }
  if (row.page !== null && row.page > 1) return `Open at ${row.jump}`;
  if (row.moment !== null && row.moment >= 1 && context.jumpsToMoments) return `Open at ${clock(row.moment)}`;
  return "Open";
}

export interface Fact {
  title: string;
  text: string;
}

/** The details line as labelled facts, for the detail pane's metadata: Kind, Pages, Size, … */
export function factsOf(row: ResultRow): Fact[] {
  const facts: Fact[] = [];
  const { info } = row;
  const add = (title: string, text: string | null) => {
    if (text) facts.push({ title, text });
  };
  if (row.kind === "code") {
    add("Language", languageOf(row.path));
    const cells = int(info.cells);
    const lines = int(info.lines);
    if (cells !== null) add("Cells", formatCount(cells));
    else if (lines !== null) add("Lines", formatCount(lines));
  } else {
    add("Kind", KIND_TITLES[row.kind]);
    if (info.width && info.height) add("Dimensions", `${info.width} × ${info.height}`);
    const pages = int(info.pages);
    const readTo = int(info.read_to);
    if (pages !== null) add("Pages", formatCount(pages) + (readTo !== null ? `, ${readTo} read so far` : ""));
    else if (readTo !== null) add("Read", "partly read so far");
    if (row.duration !== null) add("Duration", clock(row.duration));
  }
  if (row.size > 0) add("Size", bytes(row.size));
  return facts;
}

export interface ResultGroup {
  kind: ResultGroupKind;
  rows: ResultRow[];
  /** Strong results of this kind, shown or not. */
  total: number;
}

/** Search results the way they're shown: the strong ones grouped by kind, the weaker ones folded underneath. */
export interface ResultSet {
  groups: ResultGroup[];
  /** The strong ones in score order (the grid's list). */
  ranked: ResultRow[];
  weaker: ResultRow[];
}

export const EMPTY_RESULTS: ResultSet = { groups: [], ranked: [], weaker: [] };

export interface BuildOptions {
  terms?: string[];
  /** The response's strong count; computed from the scores when absent. */
  strong?: number;
  rowsPerGroup?: number;
  home?: string;
}

/** DigUp's ResultSet(hits, query:, rowsPerGroup:). Groups come in order of first appearance, best hit's first. */
export function buildResultSet(hits: Hit[], options: BuildOptions = {}): ResultSet {
  const terms = options.terms ?? [];
  const limit = options.rowsPerGroup ?? Number.MAX_SAFE_INTEGER;
  const strong = Math.max(0, Math.min(hits.length, options.strong ?? strongCount(hits.map((h) => h.score))));
  const ranked = hits.slice(0, strong).map((h) => makeRow(h, terms, options.home));
  const order: ResultGroupKind[] = [];
  const byGroup = new Map<ResultGroupKind, ResultRow[]>();
  for (const row of ranked) {
    const rows = byGroup.get(row.group);
    if (rows) rows.push(row);
    else {
      order.push(row.group);
      byGroup.set(row.group, [row]);
    }
  }
  return {
    groups: order.map((kind) => {
      const rows = byGroup.get(kind) as ResultRow[];
      return { kind, rows: rows.slice(0, limit), total: rows.length };
    }),
    ranked,
    weaker: hits.slice(strong).map((h) => makeRow(h, terms, options.home)),
  };
}

/** Strong results per kind (the dropdown's counts, from the unfiltered search). */
export function groupCounts(set: ResultSet): Partial<Record<ResultGroupKind, number>> {
  const counts: Partial<Record<ResultGroupKind, number>> = {};
  for (const row of set.ranked) counts[row.group] = (counts[row.group] ?? 0) + 1;
  return counts;
}

export function resultCount(set: ResultSet): string {
  const count = set.ranked.length;
  return `${count === 1 ? "1 result" : `${formatCount(count)} results`}${set.weaker.length > 0 ? ` · ${formatCount(set.weaker.length)} weaker` : ""}`;
}
