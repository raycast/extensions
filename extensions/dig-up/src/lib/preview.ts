// The detail pane's Markdown: the picture, a document's passage, a stretch of code. Pure (test/results.test.ts).
// DigUp: Previews.swift (PreviewPane, Passage, CodeLines, AudioMoment, WhyItMatched).

import { pathToFileURL } from "node:url";
import type { ThumbRequest } from "../../engine/api";
import { clock, escapeMarkdown, excerptMarkdown, markWords, matchesOf, passageWindow } from "./format";
import type { ResultRow } from "./results";

/** What a result's preview needs from the daemon. */
export interface PreviewNeeds {
  /** A picture: the file, the video frame, the PDF page, the waveform. */
  thumb: boolean;
  /** The segment's text: a document's passage ("passage") or a stretch of code ("code"). */
  text: "passage" | "code" | null;
}

export function previewNeeds(row: ResultRow): PreviewNeeds {
  const thumb =
    row.kind === "screenshot" ||
    row.kind === "image" ||
    row.kind === "video" ||
    row.kind === "pdf" ||
    row.kind === "audio";
  if (row.kind === "code") return { thumb: false, text: "code" };
  if (row.segment === "chunk") return { thumb: false, text: "passage" };
  return { thumb, text: null };
}

/** Kinds whose list icon is a picture of the file (the rest keep the file type's icon). */
export function hasListThumb(kind: ResultRow["kind"]): boolean {
  return kind === "screenshot" || kind === "image" || kind === "video" || kind === "pdf";
}

export interface Box {
  width: number;
  height: number;
}

/** The detail pane's picture area in points: DigUp's panel preview is 410 × 214. */
export const PANE_BOX: Box = { width: 410, height: 230 };
/** A pushed Detail view has the whole window. */
export const WIDE_BOX: Box = { width: 680, height: 400 };

/** A picture of `size` scaled to fit `box` (never enlarged), in whole points. */
export function fitIn(size: Box | null | undefined, box: Box): Box {
  if (!size || size.width <= 0 || size.height <= 0) return { width: box.width, height: box.height };
  const scale = Math.min(box.width / size.width, box.height / size.height, 1);
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/**
 * The Markdown image of a local file: percent-encoded (a name with spaces, "#" or brackets still works) and sized,
 * since Raycast draws a picture at its own pixel size otherwise.
 */
export function imageMarkdown(file: string, size?: Box | null, box: Box = PANE_BOX): string {
  const href = pathToFileURL(file).href.replace(/\(/g, "%28").replace(/\)/g, "%29");
  const fit = fitIn(size, box);
  const query = size ? `raycast-width=${fit.width}&raycast-height=${fit.height}` : `raycast-height=${box.height}`;
  return `![](${href}?${query})`;
}

export interface ThumbSpec extends ThumbRequest {
  /** File and index version; used only to key the UI cache. */
  version?: string;
  /** Audio: the end of the matched stretch (the waveform lights it); asked of the daemon as `locEnd`. */
  locEnd?: number | null;
}

/** The picture to ask the daemon for: the page with its words marked, the frame at the moment, the waveform. */
export function thumbSpec(row: ResultRow, maxPixel: number, marking: boolean): ThumbSpec {
  const spec: ThumbSpec = { path: row.path, kind: row.kind, maxPixel, version: previewFileKey(row) };
  if (row.kind === "pdf" && row.page !== null) {
    spec.loc = row.page;
    if (marking) spec.words = [...new Set([...row.foundWords, ...row.terms])].filter((w) => [...w].length >= 2);
  } else if (row.kind === "video" && row.loc !== null) {
    spec.loc = row.loc;
  } else if (row.kind === "audio" && row.loc !== null) {
    spec.loc = row.loc;
    spec.locEnd = row.locEnd;
  }
  return spec;
}

/** What a picture depends on: the file, the page or moment, the words marked on a page, the size. */
export function thumbKey(spec: ThumbSpec): string {
  return [
    spec.version ?? "",
    spec.path,
    spec.kind,
    spec.loc ?? "",
    spec.locEnd ?? "",
    (spec.words ?? []).join(" "),
    spec.maxPixel ?? "",
  ].join("|");
}

const CODE_WINDOW = 40;
const CODE_LINE_WIDTH = 110;

function fence(body: string): string {
  const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
  const marks = "`".repeat(Math.max(3, longest + 1));
  return `${marks}\n${body}\n${marks}`;
}

/** The lines of code that matched, numbered as in the file, with the line it opens at marked "▶". */
export function codeMarkdown(row: ResultRow, text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n$/, "")
    .split("\n")
    .map((l) => l.replace(/\t/g, "    "));
  // A stretch's lines are the file's; a notebook's stretch has no numbers of its own, so its lines count from 1.
  const first = row.segment === "lines" ? Math.trunc(row.loc ?? 1) : 1;
  const focus = row.segment === "lines" && row.focus !== null ? Math.trunc(row.focus) - first : null;
  const words = [...row.foundWords, ...row.terms].filter((w) => [...w].length >= 2);
  const marked = lines.findIndex((line) => words.some((w) => matchesOf(w, line, 1).length > 0));
  const target = focus !== null && focus >= 0 && focus < lines.length ? focus : marked >= 0 ? marked : 0;
  const from = lines.length > CODE_WINDOW ? Math.max(0, Math.min(lines.length - CODE_WINDOW, target - 3)) : 0;
  const shown = lines.slice(from, from + CODE_WINDOW);
  const width = String(first + from + shown.length).length;
  const body = shown
    .map((line, i) => {
      const offset = from + i;
      const cut = line.length > CODE_LINE_WIDTH ? `${line.slice(0, CODE_LINE_WIDTH)}…` : line;
      return `${offset === focus ? "▶" : " "} ${String(first + offset).padStart(width)}  ${cut}`;
    })
    .join("\n");
  const more =
    lines.length > shown.length
      ? `\n\n*Lines ${first + from}–${first + from + shown.length - 1} of this stretch (${row.span ?? "code"}).*`
      : "";
  return `${fence(body)}${more}`;
}

/** A document's passage on a quote card: ~900 characters around the first matched word, the words in bold. */
export function passageMarkdown(row: ResultRow, text: string | null): string {
  const source = (text ?? row.excerpt?.replace(/[«»]/g, "") ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const words = [...row.foundWords, ...row.terms];
  const passage = passageWindow(source, words);
  const marked = markWords(passage.text, words);
  const body = `${passage.leading ? "… " : ""}${marked}${passage.trailing ? " …" : ""}`;
  const quote = body
    .split("\n")
    .map((line) => `> ${line}`.trimEnd())
    .join("\n");
  const part = row.loc !== null ? Math.trunc(row.loc) : null;
  const parts = Number(row.info.chunks);
  const label = part !== null && Number.isInteger(parts) && parts > 1 ? `\n\n*Part ${part} of ${parts}*` : "";
  return `${quote}${label}`;
}

/** "0:25 – 0:55 of 3:12": an audio hit's stretch on the file's timeline. */
export function momentSpan(row: ResultRow): string | null {
  if (row.loc === null) return null;
  const end = row.locEnd ?? row.loc + 30;
  const total = row.duration !== null ? ` of ${clock(row.duration)}` : "";
  return `${clock(row.loc)} – ${clock(end)}${total}`;
}

export interface Picture extends Box {
  path: string;
}

export interface PreviewParts {
  /** The picture once the daemon has made it; undefined while it's being made, null if it couldn't be. */
  thumb?: Picture | null;
  /** The segment's full text once it has been read; undefined while loading, null if the daemon has none. */
  text?: string | null;
  /** Room for the picture, in points. */
  box?: Box;
}

/** The whole detail Markdown for a result. */
export function previewMarkdown(row: ResultRow, parts: PreviewParts = {}): string {
  const needs = previewNeeds(row);
  const box = parts.box ?? PANE_BOX;
  const blocks: string[] = [];
  if (needs.text === "code") {
    if (typeof parts.text === "string") blocks.push(codeMarkdown(row, parts.text));
    else if (parts.text === undefined) blocks.push("*Reading the code…*");
    else if (row.excerpt) blocks.push(fence(row.excerpt.replace(/[«»]/g, "")));
  } else if (needs.text === "passage") {
    if (parts.text !== undefined || row.excerpt) blocks.push(passageMarkdown(row, parts.text ?? null));
    else blocks.push("*Reading the passage…*");
  } else if (needs.thumb) {
    if (parts.thumb) blocks.push(imageMarkdown(parts.thumb.path, parts.thumb, box));
    else if (parts.thumb === undefined) blocks.push("*Loading the preview…*");
    if (row.kind === "audio") {
      const span = momentSpan(row);
      if (span) blocks.push(`**${span}**`);
    }
    if (row.kind === "video" && row.loc !== null && row.duration) {
      blocks.push(`**${clock(row.loc)}** of ${clock(row.duration)}`);
    }
  }
  if (row.excerpt && row.kind !== "code" && row.segment !== "chunk") blocks.push(excerptMarkdown(row.excerpt));
  if (blocks.length === 0) blocks.push(`*${escapeMarkdown(row.name)}*`);
  return blocks.join("\n\n");
}

/** A file can be edited, reindexed, or replaced while its path and segment id stay the same. */
export function previewFileKey(row: ResultRow): string {
  return JSON.stringify([row.kind === "code" ? "code" : "main", row.path, row.modified, row.size, row.previewVersion]);
}

export function segmentTextKey(row: ResultRow): string {
  return JSON.stringify([previewFileKey(row), row.segmentId]);
}
