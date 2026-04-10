import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";

const BOX_EXTRA_CHARS = new Set([
  "│",
  "┃",
  "║",
  "╎",
  "╏",
  "┆",
  "┇",
  "┊",
  "┋",
  "╭",
  "╮",
  "╯",
  "╰",
  "╱",
  "╲",
  "╳",
  "╼",
  "╾",
  "╽",
  "╿",
  "═",
  "╬",
  "╫",
  "╪",
  "╠",
  "╣",
  "╨",
  "╥",
  "╦",
  "╩",
  "╚",
  "╔",
  "╙",
  "╓",
  "╜",
  "╛",
  "╘",
  "╒",
  "╕",
  "╖",
  "╡",
  "╢",
  "╞",
  "╟",
  "╧",
  "╤",
  "━",
  "┄",
  "┅",
  "┈",
  "┉",
  "┌",
  "┐",
  "└",
  "┘",
  "├",
  "┤",
  "┬",
  "┴",
  "┼",
]);

const PIPE_CHARS = new Set([
  "|",
  "¦",
  "│",
  "┃",
  "║",
  "╎",
  "╏",
  "╽",
  "╿",
  "┆",
  "┇",
  "┊",
  "┋",
  "▌",
  "▍",
  "▎",
  "▏",
  "▐",
  "▕",
]);

const PIPE_WHITESPACE = new Set([" ", "\t", "\f", "\v", "\u00A0"]);

const CODE_KEYWORD_PATTERN =
  /\b(def|class|return|function|const|let|var|import|package|namespace|async|await|->)\b/;

function isBoxChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x2500 && code <= 0x257f) return true;
  if (code >= 0x2580 && code <= 0x259f) return true;
  if (BOX_EXTRA_CHARS.has(ch)) return true;
  return false;
}

function stripBoxArt(line: string): string {
  return Array.from(line)
    .filter((ch) => !isBoxChar(ch))
    .join("");
}

function trimPipeEdges(line: string): string {
  let start = 0;
  const length = line.length;

  while (start < length && PIPE_WHITESPACE.has(line[start])) start++;
  const pipeStart = start;
  while (start < length && PIPE_CHARS.has(line[start])) start++;
  const removedLeading = start > pipeStart;

  let trimmed = removedLeading ? line.slice(start) : line;
  if (removedLeading && trimmed.length > 0 && PIPE_WHITESPACE.has(trimmed[0])) {
    trimmed = trimmed.slice(1);
  }

  let end = trimmed.length;
  while (end > 0 && PIPE_WHITESPACE.has(trimmed[end - 1])) end--;
  let pipeEnd = end;
  while (pipeEnd > 0 && PIPE_CHARS.has(trimmed[pipeEnd - 1])) pipeEnd--;
  const removedTrailing = pipeEnd < end;
  trimmed = trimmed.slice(0, pipeEnd);
  if (
    removedTrailing &&
    trimmed.length > 0 &&
    PIPE_WHITESPACE.has(trimmed[trimmed.length - 1])
  ) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}

function normalizeIndentation(lines: string[]): string[] {
  const normalized = lines.map((l) => l.trimEnd());
  const contentLines = normalized.filter((l) => l.trim().length > 0);
  if (contentLines.length === 0) return normalized;

  const leadingSpaces = contentLines.map(
    (l) => l.length - l.trimStart().length,
  );
  const remove = Math.min(...leadingSpaces);
  if (remove <= 0) return normalized;

  return normalized.map((l) => (l.length >= remove ? l.slice(remove) : l));
}

function collapseParagraphs(lines: string[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const rawLine of lines) {
    const collapsed = rawLine.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }
    current.push(collapsed);
  }
  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return paragraphs.join("\n\n");
}

function formatCode(lines: string[]): string {
  const trimmed = normalizeIndentation(lines.map((l) => l.trimEnd()));
  while (trimmed.length > 0 && !trimmed[0].trim()) trimmed.shift();
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1].trim())
    trimmed.pop();
  return trimmed.join("\n");
}

function guessMode(lines: string[]): "text" | "code" {
  let codeScore = 0;
  let textScore = 0;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;
    if (CODE_KEYWORD_PATTERN.test(stripped)) codeScore += 2;
    if (/[{}();=<>]/.test(stripped)) codeScore += 1;
    if (/[.!?]"?$/.test(stripped)) textScore += 2;
    if (stripped.length > 80) textScore += 1;
  }

  return codeScore > textScore ? "code" : "text";
}

function cleanText(
  raw: string,
  mode: string,
): { cleaned: string; resolvedMode: "text" | "code" } {
  const prepped = raw.split("\n").map((line) => {
    let stripped = trimPipeEdges(line);
    stripped = stripBoxArt(stripped);
    stripped = stripped.trimEnd();
    return stripped;
  });

  const resolvedMode: "text" | "code" =
    mode === "auto" ? guessMode(prepped) : (mode as "text" | "code");

  const cleaned =
    resolvedMode === "code" ? formatCode(prepped) : collapseParagraphs(prepped);

  return { cleaned, resolvedMode };
}

export default async function Command() {
  const { mode } = getPreferenceValues<Preferences.Clean>();
  const raw = await Clipboard.readText();

  if (!raw) {
    await showHUD("Clipboard is empty");
    return;
  }

  const { cleaned, resolvedMode } = cleanText(raw, mode);
  await Clipboard.copy(cleaned);
  await showHUD(`Cleaned clipboard (${resolvedMode})`);
}
