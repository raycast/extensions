// Text helpers shared by every command. Pure: no @raycast/api, so node:test can run them (test/format.test.ts).
// Ports of DigUp's ResultRow formatting (Results.swift), Estimates.swift, CodeExtractor.language and the parts of
// SearchText (normalized, matches) that the preview marks words with.

import { homedir } from "node:os";

// MARK: Numbers, sizes, time

/** 1,234 → "1,234". */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "1 file", "2 files". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** DigUp's ResultRow.clock: m:ss, or h:mm:ss from an hour on. */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds));
  const two = (n: number) => String(n).padStart(2, "0");
  if (total >= 3600) return `${Math.trunc(total / 3600)}:${two(Math.trunc(total / 60) % 60)}:${two(total % 60)}`;
  return `${Math.trunc(total / 60)}:${two(total % 60)}`;
}

/** "Oct 1, 2026" (Swift's `.abbreviated` date, English). `epochSeconds` is a file's mtime. */
export function shortDate(epochSeconds: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(epochSeconds * 1000),
  );
}

/** "Oct 1, 2026 at 3:07 PM". */
export function longDate(epochSeconds: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(epochSeconds * 1000));
}

/** "1:00 AM" (Swift's `formatted(date: .omitted, time: .shortened)`, English). `epochMs` as the daemon sends times. */
export function shortTime(epochMs: number): string {
  // Newer ICU puts a narrow no-break space before AM/PM; DigUp's strings are written with a plain one.
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(new Date(epochMs))
    .replace(/\u202f/g, " ");
}

const UNITS = ["KB", "MB", "GB", "TB"];

/** ByteCountFormatter (.file): decimal units, "512 bytes", "2 KB", "2.1 MB", "23 MB", "1.2 GB". */
export function bytes(n: number): string {
  if (n < 1000) return `${Math.max(0, Math.round(n))} ${Math.round(n) === 1 ? "byte" : "bytes"}`;
  let unit = 0;
  let value = n / 1000;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${shortNumber(value, unit === 0)} ${UNITS[unit]}`;
}

function shortNumber(value: number, wholeOnly: boolean): string {
  if (wholeOnly || value >= 10) return String(Math.round(value));
  const text = value.toFixed(1);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

/** DigUp's roughDuration: "8 s", "2 min", "1.5 h": the precision an estimate deserves. */
export function roughDuration(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

/** "≈ 8 s", "≈ 2 min", or "< 1 s" for a few short files. */
export function approximately(seconds: number): string {
  return seconds < 0.5 ? "< 1 s" : `≈ ${roughDuration(seconds)}`;
}

/** "40 MB", "1.2 GB": the precision an estimate of an index's size deserves (one unit, rounded). */
export function roughBytes(n: number): string {
  const rounded = n < 10_000_000 ? n : Math.round(n / 1_000_000) * 1_000_000;
  if (rounded < 1_000_000) return `${Math.round(rounded / 1000)} KB`;
  if (rounded < 1_000_000_000) return `${shortNumber(rounded / 1_000_000, false)} MB`;
  return `${shortNumber(rounded / 1_000_000_000, false)} GB`;
}

/** "less than a minute left", "about 3 min left" (DigUp's ModelDownload.progressText). */
export function timeLeft(seconds: number): string {
  return seconds < 50 ? "less than a minute left" : `about ${roughDuration(seconds)} left`;
}

// MARK: Paths

/** "/Users/me/Downloads" → "~/Downloads" (NSString.abbreviatingWithTildeInPath). */
export function tildePath(path: string, home: string = homedir()): string {
  if (path === home) return "~";
  return home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

export function baseName(path: string): string {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const slash = trimmed.lastIndexOf("/");
  return slash < 0 ? trimmed : trimmed.slice(slash + 1) || "/";
}

export function dirName(path: string): string {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const slash = trimmed.lastIndexOf("/");
  return slash <= 0 ? (slash === 0 ? "/" : ".") : trimmed.slice(0, slash);
}

export function extensionOf(path: string): string {
  const name = baseName(path);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

const LANGUAGES: Record<string, string> = {
  py: "Python",
  pyi: "Python",
  pyx: "Cython",
  ipynb: "Notebook",
  c: "C",
  h: "C header",
  cc: "C++",
  cpp: "C++",
  cxx: "C++",
  hpp: "C++ header",
  hh: "C++ header",
  hxx: "C++ header",
  m: "Objective-C",
  mm: "Objective-C++",
  swift: "Swift",
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  scala: "Scala",
  groovy: "Groovy",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  fs: "F#",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  ps1: "PowerShell",
  lua: "Lua",
  pl: "Perl",
  pm: "Perl",
  r: "R",
  jl: "Julia",
  dart: "Dart",
  sql: "SQL",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  gradle: "Gradle",
  cmake: "CMake",
  mk: "Makefile",
  proto: "Protocol Buffers",
  graphql: "GraphQL",
  gql: "GraphQL",
  tf: "Terraform",
  hcl: "HCL",
  nix: "Nix",
  zig: "Zig",
  hs: "Haskell",
  ex: "Elixir",
  exs: "Elixir",
  erl: "Erlang",
  clj: "Clojure",
  cljs: "ClojureScript",
  elm: "Elm",
  ml: "OCaml",
  mli: "OCaml",
  vim: "Vim script",
  el: "Emacs Lisp",
  lisp: "Lisp",
  asm: "Assembly",
  s: "Assembly",
  metal: "Metal",
  glsl: "GLSL",
  hlsl: "HLSL",
  wgsl: "WGSL",
  cu: "CUDA",
  cuh: "CUDA",
  ino: "Arduino",
  v: "Verilog",
  sv: "SystemVerilog",
  tex: "LaTeX",
  md: "Markdown",
  markdown: "Markdown",
  rst: "reStructuredText",
  adoc: "AsciiDoc",
  org: "Org",
  txt: "Text",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
};

const CODE_FILE_NAMES = new Set([
  "Makefile",
  "makefile",
  "GNUmakefile",
  "Dockerfile",
  "Containerfile",
  "Justfile",
  "justfile",
  "Rakefile",
  "Gemfile",
  "Podfile",
  "Brewfile",
  "Procfile",
  "Vagrantfile",
  "Jenkinsfile",
]);

/** DigUp's CodeExtractor.language: "Swift", "Python", "Markdown": what a file's extension says it's written in. */
export function languageOf(path: string): string {
  const name = baseName(path);
  const dot = name.lastIndexOf(".");
  const ext = dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
  const language = Object.prototype.hasOwnProperty.call(LANGUAGES, ext) ? LANGUAGES[ext] : undefined;
  if (language) return language;
  if (CODE_FILE_NAMES.has(name) || name.startsWith("Dockerfile")) return name;
  return ext === "" ? "Text" : ext.toUpperCase();
}

// MARK: Search text (DigUp: SearchText)

/**
 * DigUp's SearchText.normalized: NFKC, invisible formatting characters dropped, Arabic the way people type it
 * (no tatweel, no short-vowel marks, one alef).
 */
export function normalizedText(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFKC")) {
    const c = ch.codePointAt(0) as number;
    if (c === 0x200b) out += " ";
    else if (
      c === 0x00ad ||
      c === 0x061c ||
      (c >= 0x200c && c <= 0x200f) ||
      (c >= 0x202a && c <= 0x202e) ||
      (c >= 0x2060 && c <= 0x2064) ||
      (c >= 0x2066 && c <= 0x2069) ||
      c === 0xfeff
    )
      continue;
    else if (c === 0x0640 || (c >= 0x064b && c <= 0x065f) || c === 0x0670) continue;
    else if (c === 0x0622 || c === 0x0623 || c === 0x0625 || c === 0x0671) out += "ا";
    else out += ch;
  }
  return out;
}

/** True for words of scripts that attach endings to words (Bengali, Hindi, Arabic): matched as prefixes. */
export function inflects(word: string): boolean {
  for (const ch of word) {
    const c = ch.codePointAt(0) as number;
    if ((c >= 0x0900 && c <= 0x0dff) || (c >= 0x0600 && c <= 0x06ff)) return true;
  }
  return false;
}

const WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Case, diacritic (Latin, Greek, Cyrillic accents) and compatibility folding: what a match ignores. */
function fold(text: string): string {
  return normalizedText(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
}

interface Grapheme {
  start: number;
  end: number;
  text: string;
}

function isWordGrapheme(g: Grapheme | undefined): boolean {
  return g !== undefined && WORD_CHARACTER.test(g.text);
}

/**
 * DigUp's SearchText.matches(of:in:): where `word` is in `text`, as whole words, ignoring case and accents; a word of
 * a script that attaches endings marks the whole word it starts. Ranges are [start, end) UTF-16 offsets into `text`.
 */
export function matchesOf(word: string, text: string, limit = 500): Array<[number, number]> {
  const needle = fold(word);
  if (!needle || !text) return [];
  // The text folded one character at a time, remembering which character each piece came from.
  const graphemes: Grapheme[] = [];
  let folded = "";
  const owner: number[] = [];
  for (const { segment, index } of GRAPHEMES.segment(text)) {
    const piece = fold(segment);
    graphemes.push({ start: index, end: index + segment.length, text: segment });
    for (let i = 0; i < piece.length; i++) owner.push(graphemes.length - 1);
    folded += piece;
  }
  const prefix = inflects(word);
  const found: Array<[number, number]> = [];
  let from = 0;
  while (found.length < limit) {
    const hit = folded.indexOf(needle, from);
    if (hit < 0) break;
    from = hit + needle.length;
    const first = owner[hit];
    let last = owner[hit + needle.length - 1];
    if (first === undefined || last === undefined) continue;
    if (isWordGrapheme(graphemes[first - 1])) continue;
    if (isWordGrapheme(graphemes[last + 1])) {
      if (!prefix) continue;
      while (isWordGrapheme(graphemes[last + 1])) last++;
    }
    const start = graphemes[first].start;
    const end = graphemes[last].end;
    const previous = found[found.length - 1];
    if (previous && start < previous[1]) continue;
    found.push([start, end]);
  }
  return found;
}

// MARK: Marked words (« » from keyword search)

/** The words keyword search found in an excerpt (marked « »), as they're written there, without repeats. */
export function foundWordsOf(excerpt: string | null | undefined): string[] {
  const words: string[] = [];
  if (!excerpt) return words;
  let rest = excerpt;
  for (;;) {
    const open = rest.indexOf("«");
    if (open < 0) break;
    const close = rest.indexOf("»", open);
    if (close < 0) break;
    const word = rest.slice(open + 1, close);
    if (word && !words.includes(word)) words.push(word);
    rest = rest.slice(close + 1);
  }
  return words;
}

export function stripMarks(text: string): string {
  return text.replace(/[«»]/g, "");
}

const MARKDOWN_SPECIALS = /[\\`*_[\]<>~|#]/g;

/** Backslash-escapes what Markdown would read as formatting, so file text shows as written. */
export function escapeMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_SPECIALS, (c) => `\\${c}`)
    .replace(/^(\s*)([-+=])/gm, (_m, lead: string, mark: string) => `${lead}\\${mark}`)
    .replace(
      /^(\s*)(\d+)([.)])(\s)/gm,
      (_m, lead: string, digits: string, mark: string, space: string) => `${lead}${digits}\\${mark}${space}`,
    );
}

/** An excerpt with «matched» words as **bold** (the rest escaped): the preview's marker, in Markdown. */
export function excerptMarkdown(excerpt: string): string {
  const parts = excerpt.split(/«([^»]*)»/);
  // split with one capture group alternates plain, marked, plain, ...
  return parts
    .map((part, i) =>
      i % 2 === 1 ? (part.trim() ? `**${escapeMarkdown(part)}**` : escapeMarkdown(part)) : escapeMarkdown(part),
    )
    .join("");
}

/** `text` with every match of `words` in **bold** (words of 2+ characters). Overlapping matches merge. */
export function markWords(text: string, words: string[]): string {
  const spans: Array<[number, number]> = [];
  for (const word of new Set(words.filter((w) => [...w].length >= 2))) spans.push(...matchesOf(word, text));
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  let out = "";
  let cursor = 0;
  for (const [start, end] of merged) {
    out += escapeMarkdown(text.slice(cursor, start));
    const word = text.slice(start, end);
    out += word.trim() === word ? `**${escapeMarkdown(word)}**` : escapeMarkdown(word);
    cursor = end;
  }
  return out + escapeMarkdown(text.slice(cursor));
}

export interface Passage {
  /** Up to 900 characters, starting just before the first matched word when that is past character 200. */
  text: string;
  leading: boolean;
  trailing: boolean;
}

const PASSAGE_LENGTH = 900;

/** DigUp's Passage.marked window: ~900 characters from 160 before the first matched word if it is beyond char 200. */
export function passageWindow(source: string, words: string[]): Passage {
  const distinct = [...new Set(words.filter((w) => [...w].length >= 2))];
  let first = Infinity;
  for (const word of distinct) {
    const hit = matchesOf(word, source, 1)[0];
    if (hit && hit[0] < first) first = hit[0];
  }
  let start = 0;
  if (Number.isFinite(first) && first > 200) {
    start = first - 160;
    while (start < first && !/\s/u.test(source[start])) start++;
  }
  const window = source.slice(start, start + PASSAGE_LENGTH);
  // Never end on half a surrogate pair.
  const safe = /[\ud800-\udbff]$/.test(window) ? window.slice(0, -1) : window;
  return {
    text: start > 0 ? safe.replace(/^\s+/, "") : safe,
    leading: start > 0,
    trailing: source.length - start > PASSAGE_LENGTH,
  };
}

/** Arabic or Hebrew text reads from the right (DigUp's Passage.isRightToLeft). */
export function isRightToLeft(text: string): boolean {
  for (const ch of text) {
    if (/\p{Alphabetic}/u.test(ch)) {
      const c = ch.codePointAt(0) as number;
      return (c >= 0x0590 && c <= 0x08ff) || (c >= 0xfb1d && c <= 0xfefc);
    }
  }
  return false;
}
