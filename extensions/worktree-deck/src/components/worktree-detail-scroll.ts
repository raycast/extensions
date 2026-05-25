import type { Keyboard } from "@raycast/api";

/**
 * 詳細ペインを上方向へ送るショートカット
 */
export const SCROLL_DETAIL_UP_SHORTCUT = { modifiers: ["shift"], key: "arrowUp" } satisfies Keyboard.Shortcut;

/**
 * 詳細ペインを下方向へ送るショートカット
 */
export const SCROLL_DETAIL_DOWN_SHORTCUT = { modifiers: ["shift"], key: "arrowDown" } satisfies Keyboard.Shortcut;

/**
 * 詳細ペインのスクロール方向
 */
export type DetailScrollDirection = "up" | "down";

/**
 * Markdown の先頭に置ける安全なスクロール位置を返す
 */
export function resolveSafeDetailScrollOffset(markdown: string, offset: number): number {
  const lines = splitDetailMarkdownLines(markdown);
  if (lines.length === 0) {
    return 0;
  }
  const boundedOffset = Math.min(Math.max(Math.trunc(offset), 0), lines.length - 1);
  const contentStartIndex = resolveScrollableContentStartIndex(lines);
  if (boundedOffset === 0) {
    return boundedOffset;
  }
  if (boundedOffset < contentStartIndex) {
    return resolveReadableDetailScrollOffset(lines, contentStartIndex, "down");
  }
  return resolveReadableDetailScrollOffset(lines, boundedOffset, "down");
}

/**
 * 詳細ペインの次のスクロール位置を返す
 */
export function resolveNextDetailScrollOffset(args: {
  markdown: string;
  currentOffset: number;
  direction: DetailScrollDirection;
}): number {
  if (args.direction === "up") {
    const lines = splitDetailMarkdownLines(args.markdown);
    const contentStartIndex = resolveScrollableContentStartIndex(lines);
    if (contentStartIndex > 0 && args.currentOffset <= contentStartIndex) {
      return 0;
    }
    return resolveReadableDetailScrollOffset(lines, args.currentOffset - 1, "up");
  }
  return resolveSafeDetailScrollOffset(args.markdown, args.currentOffset + 1);
}

/**
 * スクロール位置を反映した詳細 Markdown を返す
 */
export function buildScrollableDetailMarkdown(markdown: string, offset: number): string {
  const lines = splitDetailMarkdownLines(markdown);
  const safeOffset = resolveSafeDetailScrollOffset(markdown, offset);
  const tableRange = resolveMarkdownTableRange(lines, safeOffset);
  if (tableRange && safeOffset > tableRange.startIndex) {
    const visibleStartIndex = Math.max(safeOffset, tableRange.separatorIndex + 1);
    return [
      ...lines.slice(tableRange.startIndex, tableRange.separatorIndex + 1),
      ...lines.slice(visibleStartIndex),
    ].join("\n");
  }
  return lines.slice(safeOffset).join("\n");
}

/**
 * Markdown を詳細ペインのスクロール単位へ分割する
 */
function splitDetailMarkdownLines(markdown: string): string[] {
  return markdown.replace(/\r\n/g, "\n").split("\n");
}

/**
 * 詳細テーブル後の本文開始位置を返す
 */
function resolveScrollableContentStartIndex(lines: string[]): number {
  const blankLineIndex = lines.findIndex((line) => line.trim() === "");
  if (blankLineIndex < 0) {
    return 0;
  }
  const initialTableRange = resolveMarkdownTableRangeFromStart(lines);
  if (!initialTableRange || initialTableRange.endIndex !== blankLineIndex - 1) {
    return 0;
  }
  const contentStartIndex = blankLineIndex + 1;
  return contentStartIndex >= lines.length ? 0 : contentStartIndex;
}

/**
 * 空白行を避けた読み取り可能なスクロール位置を返す
 */
function resolveReadableDetailScrollOffset(lines: string[], offset: number, direction: DetailScrollDirection): number {
  const boundedOffset = Math.min(Math.max(Math.trunc(offset), 0), lines.length - 1);
  if (lines[boundedOffset]?.trim() !== "") {
    return boundedOffset;
  }
  const delta = direction === "down" ? 1 : -1;
  for (let index = boundedOffset + delta; index >= 0 && index < lines.length; index += delta) {
    if (lines[index]?.trim() !== "") {
      return index;
    }
  }
  for (let index = boundedOffset - delta; index >= 0 && index < lines.length; index -= delta) {
    if (lines[index]?.trim() !== "") {
      return index;
    }
  }
  return boundedOffset;
}

/**
 * 指定行が属する Markdown テーブル範囲を返す
 */
function resolveMarkdownTableRange(
  lines: string[],
  offset: number,
): { startIndex: number; separatorIndex: number; endIndex: number } | null {
  if (lines.length === 0) {
    return null;
  }
  const boundedOffset = Math.min(Math.max(Math.trunc(offset), 0), lines.length - 1);
  const rangeStartIndex = findMarkdownTableStartIndex(lines, boundedOffset);
  if (rangeStartIndex === null) {
    return null;
  }
  const separatorIndex = rangeStartIndex + 1;
  let endIndex = separatorIndex;
  for (let index = separatorIndex + 1; index < lines.length; index += 1) {
    if (!isMarkdownTableRow(lines[index] ?? "")) {
      break;
    }
    endIndex = index;
  }
  if (boundedOffset > endIndex) {
    return null;
  }
  return { startIndex: rangeStartIndex, separatorIndex, endIndex };
}

/**
 * 先頭行から始まる Markdown テーブル範囲を返す
 */
function resolveMarkdownTableRangeFromStart(
  lines: string[],
): { startIndex: number; separatorIndex: number; endIndex: number } | null {
  if (!isMarkdownTableRow(lines[0] ?? "") || !isMarkdownTableSeparator(lines[1] ?? "")) {
    return null;
  }
  let endIndex = 1;
  for (let index = 2; index < lines.length; index += 1) {
    if (!isMarkdownTableRow(lines[index] ?? "")) {
      break;
    }
    endIndex = index;
  }
  return { startIndex: 0, separatorIndex: 1, endIndex };
}

/**
 * 指定行の直前にある Markdown テーブル先頭行を返す
 */
function findMarkdownTableStartIndex(lines: string[], offset: number): number | null {
  for (let index = offset; index >= 0; index -= 1) {
    if (!isMarkdownTableRow(lines[index] ?? "")) {
      return null;
    }
    if (index > 0 && isMarkdownTableSeparator(lines[index] ?? "") && isMarkdownTableRow(lines[index - 1] ?? "")) {
      return index - 1;
    }
  }
  return null;
}

/**
 * Markdown テーブル行かどうかを判定する
 */
function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  return splitMarkdownTableCells(trimmed) !== null;
}

/**
 * Markdown テーブルの区切り行かどうかを判定する
 */
function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  const cells = splitMarkdownTableCells(trimmed);
  if (!cells) {
    return false;
  }
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * Markdown テーブル行をセル配列へ分割する
 */
function splitMarkdownTableCells(line: string): string[] | null {
  const trimmed = line.trim();
  const body = trimmed.startsWith("|") && trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed;
  if (!body.includes("|")) {
    return null;
  }
  const cells = body.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => cell.length > 0) ? cells : null;
}
