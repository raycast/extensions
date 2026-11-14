/**
 * Word diff for the result view. `diffSegments` is the base of the green highlights in
 * `diff-image.ts`. The Markdown rendering here is their fallback for text too long for an image.
 */

import { diffArrays } from "diff";

export interface DiffStyle {
  removedOpen: string;
  removedClose: string;
  addedOpen: string;
  addedClose: string;
}

export const STRIKETHROUGH_DIFF_STYLE: DiffStyle = {
  removedOpen: "~~",
  removedClose: "~~",
  addedOpen: "**",
  addedClose: "**",
};

export const BRACKET_DIFF_STYLE: DiffStyle = {
  removedOpen: "[-",
  removedClose: "-]",
  addedOpen: "**",
  addedClose: "**",
};

export const DEFAULT_DIFF_STYLE: DiffStyle = STRIKETHROUGH_DIFF_STYLE;

/**
 * Limits for the O(ND) diff. Both are about keeping a Raycast command responsive, not accuracy: above them the text
 * is dissimilar or huge enough that a word diff stops being readable anyway, so the preview shows the plain result.
 */
const MAX_DIFF_CHARS = 200_000;
const MAX_EDIT_LENGTH = 5_000;
const DIFF_TIMEOUT_MS = 250;

export type DiffSegment = { type: "equal"; text: string } | { type: "change"; removed: string; added: string };

export interface DiffOutcome {
  markdown: string;
  /** False when the limits were hit and `markdown` is just the escaped result. */
  highlighted: boolean;
}

function tokenize(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? [];
}

/** Returns undefined when the limits are exceeded. */
export function diffSegments(original: string, result: string): DiffSegment[] | undefined {
  if (original.length > MAX_DIFF_CHARS || result.length > MAX_DIFF_CHARS) return undefined;

  const parts = diffArrays(tokenize(original), tokenize(result), {
    maxEditLength: MAX_EDIT_LENGTH,
    timeout: DIFF_TIMEOUT_MS,
  });
  if (!parts) return undefined;

  const segments: DiffSegment[] = [];
  let removed = "";
  let added = "";
  const flush = () => {
    if (removed || added) segments.push({ type: "change", removed, added });
    removed = "";
    added = "";
  };

  parts.forEach((part, index) => {
    const text = part.value.join("");
    if (part.removed) {
      removed += text;
    } else if (part.added) {
      added += text;
    } else if ((removed || added) && index < parts.length - 1 && /^[^\S\r\n]+$/.test(text)) {
      // Only a blank separates two changes in one line: one "old → new" block reads better than word salad.
      removed += text;
      added += text;
    } else {
      flush();
      segments.push({ type: "equal", text });
    }
  });
  flush();
  return segments;
}

function escapeInline(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!~|<>&=]/g, "\\$&");
}

/**
 * Keeps the line structure through Markdown: a plain newline would collapse into a space, and leading indentation
 * would turn a line into a code block.
 */
function preserveLines(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  return lines
    .map((line, index) => {
      const body = line.trimEnd();
      const indent = body.length - body.trimStart().length;
      const kept = " ".repeat(indent) + body.slice(indent);
      const next = lines[index + 1];
      return kept !== "" && next !== undefined && next.trim() !== "" ? `${kept}  ` : kept;
    })
    .join("\n");
}

/** Escapes text so that `#` or `*` in a result show up literally, and keeps its line breaks. */
export function escapeMarkdown(text: string): string {
  return preserveLines(escapeInline(text));
}

/** Delimiters only work right next to text, so `~~ a ~~` must become ` ~~a~~ `, and each line needs its own pair. */
function wrapLines(text: string, open: string, close: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const core = line.trim();
      return core === "" ? "" : `${open}${escapeInline(core)}${close}`;
    })
    .join("\n");
}

function edgeWhitespace(text: string): { leading: string; trailing: string } {
  const start = text.trimStart();
  if (start === "") return { leading: text, trailing: "" };
  return { leading: text.slice(0, text.length - start.length), trailing: start.slice(start.trimEnd().length) };
}

function renderChange(removed: string, added: string, style: DiffStyle): string {
  const oldPart = wrapLines(removed.trim(), style.removedOpen, style.removedClose);
  const newPart = wrapLines(added.trim(), style.addedOpen, style.addedClose);
  const body = oldPart && newPart ? `${oldPart} ${newPart}` : oldPart || newPart;

  // Surrounding whitespace comes from the text the reader ends up with. With both sides present, it only counts when
  // both agree, otherwise a merged block would gain a stray blank.
  const oldEdges = edgeWhitespace(removed);
  const newEdges = edgeWhitespace(added);
  if (!removed) return `${newEdges.leading}${body}${newEdges.trailing}`;
  if (!added) return `${oldEdges.leading}${body}${oldEdges.trailing}`;
  if (body === "") return added;
  return `${oldEdges.leading && newEdges.leading}${body}${oldEdges.trailing && newEdges.trailing}`;
}

/** How much of the result is new, from 0 to 1. Above a certain share, highlights only add noise. */
export function changeShare(segments: readonly DiffSegment[]): number {
  let changed = 0;
  let total = 0;
  for (const segment of segments) {
    const text = segment.type === "equal" ? segment.text : segment.added;
    total += text.length;
    if (segment.type === "change") changed += text.length;
  }
  return total === 0 ? 0 : changed / total;
}

export function renderSegments(segments: readonly DiffSegment[], style: DiffStyle = DEFAULT_DIFF_STYLE): string {
  const markdown = segments
    .map((segment) =>
      segment.type === "equal" ? escapeInline(segment.text) : renderChange(segment.removed, segment.added, style),
    )
    .join("");
  return preserveLines(markdown);
}

export function renderDiff(original: string, result: string, style: DiffStyle = DEFAULT_DIFF_STYLE): DiffOutcome {
  const segments = diffSegments(original, result);
  if (!segments) return { markdown: escapeMarkdown(result), highlighted: false };
  return { markdown: renderSegments(segments, style), highlighted: true };
}
