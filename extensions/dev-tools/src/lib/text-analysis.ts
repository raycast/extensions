// Cheap, CPU-only text metrics. Pure and UI-free so the command component stays
// thin and the logic can be reused. Every function is O(n) over the input text.

export interface TextAnalysis {
  // Counts
  characters: number; // Unicode code points, including whitespace
  charactersNoWhitespace: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  // Size & encoding
  bytes: number; // UTF-8
  utf16Units: number; // string.length
  graphemes: number; // visual characters (Intl.Segmenter, falls back to code points)
  nonAscii: number; // code points above U+007F
  // Readability & timing
  readingSeconds: number; // at the configured reading speed (default ~200 wpm)
  speakingSeconds: number; // at the configured speaking speed (default ~130 wpm)
  uniqueWords: number;
  avgWordLength: number;
  avgSentenceLength: number; // words per sentence
  longestWord: string;
  longestLineLength: number;
  // Character classes & frequency
  letters: number;
  digits: number;
  punctuation: number;
  whitespace: number;
  uppercase: number;
  lowercase: number;
  mostCommonWord: { value: string; count: number } | null;
  mostCommonChar: { value: string; count: number } | null; // non-whitespace
  isEmpty: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Whitespace-delimited tokens, ignoring leading/trailing whitespace. */
function splitWords(text: string): string[] {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}

/** Lines split on LF, CRLF, or a bare CR. Empty text has zero lines. */
function splitLines(text: string): string[] {
  return text === "" ? [] : text.split(/\r\n|\r|\n/);
}

/** Count global-regex matches without keeping the match array around longer than needed. */
function countMatches(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

/** Visual character count via Intl.Segmenter, falling back to code points where unavailable. */
function countGraphemes(text: string): number {
  if (text === "") return 0;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const iterator = segmenter.segment(text)[Symbol.iterator]();
    let count = 0;
    while (!iterator.next().done) count++;
    return count;
  }
  return [...text].length;
}

/** Normalize a token for frequency counting: lowercased, surrounding non-alphanumerics stripped. */
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export interface QuickSummary {
  characters: number;
  words: number;
  lines: number;
  bytes: number;
  readingSeconds: number;
}

/** Reading/speaking speeds (words per minute) used for the timing estimates. */
export interface SpeedOptions {
  readingWpm?: number; // default 200
  speakingWpm?: number; // default 130
}

const DEFAULT_READING_WPM = 200;
const DEFAULT_SPEAKING_WPM = 130;

/** Cheap headline metrics for the live form — avoids the full analysis on every keystroke. */
export function quickSummary(text: string, readingWpm = DEFAULT_READING_WPM): QuickSummary {
  const words = splitWords(text).length;
  return {
    characters: [...text].length,
    words,
    lines: splitLines(text).length,
    bytes: Buffer.byteLength(text, "utf8"),
    readingSeconds: (words / readingWpm) * 60,
  };
}

/** Full text analysis — every metric in one go. */
export function analyze(text: string, speeds: SpeedOptions = {}): TextAnalysis {
  const readingWpm = speeds.readingWpm ?? DEFAULT_READING_WPM;
  const speakingWpm = speeds.speakingWpm ?? DEFAULT_SPEAKING_WPM;
  const codePoints = [...text];
  const characters = codePoints.length;

  const rawWords = splitWords(text);
  const lineList = splitLines(text);

  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;

  const whitespace = countMatches(text, /\s/g);

  // Word-frequency table over normalized tokens.
  const wordCounts = new Map<string, number>();
  for (const raw of rawWords) {
    const key = normalizeWord(raw);
    if (key) wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1);
  }
  let mostCommonWord: { value: string; count: number } | null = null;
  for (const [value, count] of wordCounts) {
    if (!mostCommonWord || count > mostCommonWord.count) mostCommonWord = { value, count };
  }

  // Longest word (by code points).
  let longestWord = "";
  let longestWordLen = 0;
  let totalWordLen = 0;
  for (const word of rawWords) {
    const len = [...word].length;
    totalWordLen += len;
    if (len > longestWordLen) {
      longestWord = word;
      longestWordLen = len;
    }
  }

  // Longest line (by code points).
  let longestLineLength = 0;
  for (const line of lineList) {
    const len = [...line].length;
    if (len > longestLineLength) longestLineLength = len;
  }

  // Most common non-whitespace character.
  const charCounts = new Map<string, number>();
  for (const ch of codePoints) {
    if (/\s/.test(ch)) continue;
    charCounts.set(ch, (charCounts.get(ch) ?? 0) + 1);
  }
  let mostCommonChar: { value: string; count: number } | null = null;
  for (const [value, count] of charCounts) {
    if (!mostCommonChar || count > mostCommonChar.count) mostCommonChar = { value, count };
  }

  return {
    characters,
    charactersNoWhitespace: characters - whitespace,
    words: rawWords.length,
    lines: lineList.length,
    sentences,
    paragraphs,

    bytes: Buffer.byteLength(text, "utf8"),
    utf16Units: text.length,
    graphemes: countGraphemes(text),
    nonAscii: codePoints.filter((ch) => (ch.codePointAt(0) ?? 0) > 127).length,

    readingSeconds: (rawWords.length / readingWpm) * 60,
    speakingSeconds: (rawWords.length / speakingWpm) * 60,
    uniqueWords: wordCounts.size,
    avgWordLength: rawWords.length ? round2(totalWordLen / rawWords.length) : 0,
    avgSentenceLength: sentences ? round2(rawWords.length / sentences) : 0,
    longestWord,
    longestLineLength,

    letters: countMatches(text, /\p{L}/gu),
    digits: countMatches(text, /\p{Nd}/gu),
    punctuation: countMatches(text, /\p{P}/gu),
    whitespace,
    uppercase: countMatches(text, /\p{Lu}/gu),
    lowercase: countMatches(text, /\p{Ll}/gu),
    mostCommonWord,
    mostCommonChar,
    isEmpty: text.length === 0,
  };
}

export interface CharFrequency {
  char: string;
  label: string;
  count: number;
  percent: number;
}

/** Human-readable label for a character, spelling out whitespace and control code points. */
function charLabel(ch: string): string {
  switch (ch) {
    case " ":
      return "␣ Space";
    case "\t":
      return "⇥ Tab";
    case "\n":
      return "␊ Newline (LF)";
    case "\r":
      return "␍ Carriage return (CR)";
    case "\f":
      return "Form feed";
    case "\v":
      return "Vertical tab";
    case " ":
      return "No-break space";
  }
  const cp = ch.codePointAt(0) ?? 0;
  if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) {
    return `U+${cp.toString(16).toUpperCase().padStart(4, "0")} (control)`;
  }
  return ch;
}

/** Per-character frequency table over code points, sorted most-frequent first. */
export function characterFrequency(text: string): CharFrequency[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const ch of text) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
    total++;
  }
  const result: CharFrequency[] = [];
  for (const [char, count] of counts) {
    result.push({ char, label: charLabel(char), count, percent: total ? round2((count / total) * 100) : 0 });
  }
  result.sort((a, b) => b.count - a.count || a.char.localeCompare(b.char));
  return result;
}

/** Human-readable byte size (B / KB / MB / GB). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

/** Approximate duration like "0 sec", "~18 sec", "~1 min", or "~2 min 30 sec". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total <= 0) return "0 sec";
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes === 0) return `~${secs} sec`;
  if (secs === 0) return `~${minutes} min`;
  return `~${minutes} min ${secs} sec`;
}

/** Plain-text summary suitable for the clipboard. */
export function buildReport(a: TextAnalysis): string {
  const word = a.mostCommonWord ? `"${a.mostCommonWord.value}" (${a.mostCommonWord.count})` : "—";
  const char = a.mostCommonChar ? `"${a.mostCommonChar.value}" (${a.mostCommonChar.count})` : "—";
  return [
    "Text Analysis",
    "=============",
    `Characters: ${a.characters}`,
    `Characters (no whitespace): ${a.charactersNoWhitespace}`,
    `Words: ${a.words}`,
    `Lines: ${a.lines}`,
    `Sentences: ${a.sentences}`,
    `Paragraphs: ${a.paragraphs}`,
    "",
    `Size (UTF-8): ${formatBytes(a.bytes)}`,
    `UTF-16 code units: ${a.utf16Units}`,
    `Unicode code points: ${a.characters}`,
    `Grapheme clusters: ${a.graphemes}`,
    `Non-ASCII characters: ${a.nonAscii}`,
    "",
    `Reading time: ${formatDuration(a.readingSeconds)}`,
    `Speaking time: ${formatDuration(a.speakingSeconds)}`,
    `Unique words: ${a.uniqueWords}`,
    `Average word length: ${a.avgWordLength}`,
    `Average sentence length: ${a.avgSentenceLength} words`,
    `Longest word: ${a.longestWord || "—"}`,
    `Longest line length: ${a.longestLineLength}`,
    "",
    `Letters: ${a.letters}`,
    `Digits: ${a.digits}`,
    `Punctuation: ${a.punctuation}`,
    `Whitespace: ${a.whitespace}`,
    `Uppercase: ${a.uppercase}`,
    `Lowercase: ${a.lowercase}`,
    `Most common word: ${word}`,
    `Most common character: ${char}`,
  ].join("\n");
}

/** Structured JSON of the analysis for the clipboard. */
export function buildJson(a: TextAnalysis): string {
  return JSON.stringify(
    {
      characters: a.characters,
      charactersNoWhitespace: a.charactersNoWhitespace,
      words: a.words,
      lines: a.lines,
      sentences: a.sentences,
      paragraphs: a.paragraphs,
      bytesUtf8: a.bytes,
      utf16Units: a.utf16Units,
      codePoints: a.characters,
      graphemes: a.graphemes,
      nonAscii: a.nonAscii,
      readingSeconds: a.readingSeconds,
      speakingSeconds: a.speakingSeconds,
      uniqueWords: a.uniqueWords,
      avgWordLength: a.avgWordLength,
      avgSentenceLength: a.avgSentenceLength,
      longestWord: a.longestWord,
      longestLineLength: a.longestLineLength,
      letters: a.letters,
      digits: a.digits,
      punctuation: a.punctuation,
      whitespace: a.whitespace,
      uppercase: a.uppercase,
      lowercase: a.lowercase,
      mostCommonWord: a.mostCommonWord,
      mostCommonChar: a.mostCommonChar,
    },
    null,
    2,
  );
}
