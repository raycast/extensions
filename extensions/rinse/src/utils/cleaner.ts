// Unicode box-drawing block: U+2500–U+257F
const BOX_DRAWING_RE = /[\u2500-\u257F]/g;

// ANSI escape sequences (colors, cursor movement, erase, etc.)
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1B\[[0-9;?]*[A-Za-z]|\x1B[()][AB012]|\x1B[=>]|\x1B[78]/g;

// Spinner / progress characters (Braille + common spinner frames)
const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⠁⠂⠄⡀⢀⠠⠐⠈]/g;

// Lines that are purely decorative: only repeated ─ ═ - = ~ * # chars (3+)
const DECORATION_LINE_RE = /^[\s\-=~*#─═━]+$/;

// Sentence-ending punctuation that signals a line should NOT be joined forward
const SENTENCE_END_RE = /[.?!:]$/;

// List-marker at the start of a line that should NOT be joined onto a previous line
const LIST_MARKER_RE = /^(\s*[-*>]|\s*\d+\.)\s/;

// Leading/trailing pipe borders (│ and | with optional spaces)
const LEADING_PIPE_RE = /^\s*[│|]\s*/;
const TRAILING_PIPE_RE = /[\s│|]+$/;

// Indented non-list line (signals a code block that should not be joined)
const INDENTED_LINE_RE = /^\s/;

// Fenced code block delimiter (``` with optional language tag)
const FENCE_RE = /^```/;

function dedent(text: string): string {
  const lines = text.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return text;
  const minIndent = Math.min(...nonEmpty.map((l) => (l.match(/^( *)/) ?? ["", ""])[1].length));
  if (minIndent === 0) return text;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

export function cleanText(input: string): string {
  if (!input.trim()) {
    return input;
  }

  let text = input;

  text = text.replace(ANSI_ESCAPE_RE, "");
  text = text.replace(BOX_DRAWING_RE, "");
  text = text.replace(SPINNER_RE, "");
  text = dedent(text);

  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const rawLine of lines) {
    let line = rawLine;

    line = line.replace(LEADING_PIPE_RE, "");
    line = line.replace(TRAILING_PIPE_RE, "");

    if (DECORATION_LINE_RE.test(line)) {
      continue;
    }

    cleaned.push(line);
  }

  const joined: string[] = [];
  let inFence = false;

  for (let i = 0; i < cleaned.length; i++) {
    const current = cleaned[i];
    const next = cleaned[i + 1];

    if (FENCE_RE.test(current)) {
      inFence = !inFence;
    }

    const isIndentedCode = INDENTED_LINE_RE.test(current) && !LIST_MARKER_RE.test(current);

    const canJoin =
      !inFence &&
      !FENCE_RE.test(current) &&
      current !== "" &&
      next !== undefined &&
      next !== "" &&
      !SENTENCE_END_RE.test(current) &&
      !LIST_MARKER_RE.test(next) &&
      !isIndentedCode;

    if (canJoin) {
      cleaned[i + 1] = `${current} ${next.trimStart()}`;
    } else {
      joined.push(current);
    }
  }

  return joined
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface CleanResult {
  changed: boolean;
  cleaned: string;
  cleanedLineCount: number;
  original: string;
  originalLineCount: number;
  reductionPercent: number;
}

export function cleanWithStats(input: string): CleanResult {
  const cleaned = cleanText(input);
  const changed = cleaned !== input;
  const reductionPercent = input.length > 0 ? Math.round(((input.length - cleaned.length) / input.length) * 100) : 0;
  const originalLineCount = input.split("\n").length;
  const cleanedLineCount = cleaned.split("\n").length;

  return {
    changed,
    cleaned,
    cleanedLineCount,
    original: input,
    originalLineCount,
    reductionPercent,
  };
}
