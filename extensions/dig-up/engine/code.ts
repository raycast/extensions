// Code for the code index (DigUp: CodeExtractor.swift): a source file, a repo's doc or a notebook, cut into stretches
// of whole lines (a notebook's into whole cells) that the model reads one at a time, each knowing where it is. And
// names in code (CodeLookup): a query that's a name finds the place that defines it, and the line to open at.
//
// Swift counts Characters (grapheme clusters) and splits lines at "\n" and "\r\n" (one Character); so does this.

import { isUtf8 } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import {
  CODE_FILE_NAMES,
  SOURCE_EXTENSIONS,
  fileSystemForm,
  holdsPrivateKey,
  isProjectRootFolder,
  lastPathComponent,
  parentPath,
  pathExtension,
} from "./rules";
import {
  Graphemes,
  graphemeCount,
  graphemePrefix,
  hasPrefix,
  isWhiteSpace,
  lowercased,
  trimWhitespace,
  trimWhitespaceAndNewlines,
} from "./searchtext";
import { ExtractError } from "./text";
import type { IndexOptions } from "./types";

/** A stretch of a file: its text, and its first and last lines (or cells), from 1. */
export interface CodePiece {
  text: string;
  first: number;
  last: number;
}

export interface CodeFile {
  pieces: CodePiece[];
  /** For the model: the file's path in its repo, the repo's name first ("billing/payments/retry.py"). */
  title: string;
  /** The repo (or code project) it's in, if any. */
  repo: string | null;
  lines: number;
  /** A notebook's cells (code and notes; outputs are never read). Null for anything else. */
  cells: number | null;
}

/** The model reads 2,048 tokens of an input at most; a single line longer than this is cut here. */
export const LONGEST_PIECE = 4000;

// ---------------------------------------------------------------------------------------------------------------
// Characters and lines, as Swift sees them
// ---------------------------------------------------------------------------------------------------------------

/** `text.split(omittingEmptySubsequences: false, whereSeparator: { $0 == "\n" || $0 == "\r\n" })`. */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** `allSatisfy(\.isWhitespace)`: every Character starts with a White_Space scalar. */
function isBlank(line: string): boolean {
  if (/^\p{White_Space}*$/u.test(line)) return true;
  if (!isWhiteSpace(line.codePointAt(0) ?? 0)) return false;
  const characters = new Graphemes(line);
  for (let index = 0; index < characters.count; index++) if (!characters.isWhitespace(index)) return false;
  return true;
}

/** `split(whereSeparator: \.isWhitespace)` (empty pieces omitted). */
function words(line: string): string[] {
  return line.split(/\p{White_Space}+/u).filter((word) => word !== "");
}

/** `Character.isLetter || Character.isNumber` (first scalar Alphabetic, or with a numeric value). */
const LETTER_OR_NUMBER = /^[\p{Alphabetic}\p{N}]/u;

/** `Character.isUppercase`: an uppercase letter, or a cased one that uppercasing leaves as it is ("ĸ", "ª"); a
 *  Character of several scalars, one that uppercasing doesn't change and lowercasing does. (Checked against Swift on
 *  every code point.) */
function isUppercase(character: string): boolean {
  const first = String.fromCodePoint(character.codePointAt(0) ?? 0);
  if (first.length === character.length) {
    return /\p{Uppercase}/u.test(first) || (/\p{Cased}/u.test(first) && first.toUpperCase() === first);
  }
  return character.toUpperCase() === character && character.toLowerCase() !== character;
}

const NON_ASCII = /[\u0080-\uffff]/;

/** The case foldings that make more than one letter ("ß" → "ss", "ﬁ" → "fi", "İ" → "i̇"), which Foundation's
 *  case-insensitive search uses and a JavaScript regex doesn't; the regex's `i` does the one-letter ones. */
function foldWide(text: string): string {
  let out = "";
  for (const scalar of text) {
    const upper = scalar.toUpperCase();
    const lower = scalar.toLowerCase();
    if ([...upper].length > 1) out += upper.toLowerCase();
    else if ([...lower].length > 1) out += lower;
    else out += scalar === "\u1e9e" ? "ss" : scalar; // capital sharp s
  }
  return out;
}

/** A line as Foundation's search compares it: each Character in NFC (canonical equivalents match: an NFC "café" is
 *  in an NFD line), case-folded by `foldWide` when `foldCase`, with the Character each UTF-16 unit came from. */
function composed(characters: Graphemes, foldCase = false): { text: string; owner: (unit: number) => number } {
  if (!NON_ASCII.test(characters.text)) return { text: characters.text, owner: (unit) => characters.indexAt(unit) };
  let text = "";
  const owners: number[] = [];
  for (let index = 0; index < characters.count; index++) {
    const nfc = characters.at(index).normalize("NFC");
    const piece = foldCase ? foldWide(nfc) : nfc;
    text += piece;
    for (let unit = 0; unit < piece.length; unit++) owners.push(index);
  }
  return { text, owner: (unit) => owners[unit] };
}

/** Whether [at, after) of a `composed` text is whole Characters: Foundation's search doesn't split one. */
function isWhole(text: string, owner: (unit: number) => number, at: number, after: number): boolean {
  return (at === 0 || owner(at - 1) !== owner(at)) && (after === text.length || owner(after - 1) !== owner(after));
}

function isNameCharacter(character: string): boolean {
  return LETTER_OR_NUMBER.test(character) || character === "_" || character === "$";
}

/** The UTF-8 text of a file (a BOM dropped), else ISO Latin-1 of all of it: `String(data:encoding:)`. */
function decodeCode(bytes: Buffer): string {
  const body = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  return isUtf8(body) ? body.toString("utf8") : bytes.toString("latin1");
}

// ---------------------------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------------------------

/** Reads a code file for the code index. Throws `ExtractError.leftOut` for code that's no use to read (binary, a
 *  private key, made by a program, minified) and `ExtractError.unreadable` for a broken notebook. */
export function readCode(
  path: string,
  options: Pick<IndexOptions, "codeStretch" | "maxCodeBytes"> = { codeStretch: 1800, maxCodeBytes: 1 << 20 },
  home = homedir(),
  repos?: Map<string, boolean>,
): CodeFile {
  return codeFromBytes(readFileSync(path), path, options, home, repos);
}

/** `readCode` of bytes already read. `repos`: see `place`. */
export function codeFromBytes(
  bytes: Buffer,
  path: string,
  options: Pick<IndexOptions, "codeStretch" | "maxCodeBytes">,
  home = homedir(),
  repos?: Map<string, boolean>,
): CodeFile {
  const { repo, title } = place(path, home, repos);
  const ext = lowercased(pathExtension(lastPathComponent(path)));
  if (ext === "ipynb") {
    const cellTexts = notebookCells(bytes);
    const text = cellTexts.join("\n");
    // As for any code: more than this was written by a program (data pasted into a cell).
    if (Buffer.byteLength(text, "utf8") > options.maxCodeBytes) {
      throw ExtractError.leftOut(`cells over ${options.maxCodeBytes >> 20} MB`);
    }
    check(text, true);
    return {
      pieces: cells(cellTexts, options.codeStretch),
      title,
      repo,
      lines: lineCount(text),
      cells: cellTexts.length,
    };
  }
  if (bytes.subarray(0, 8000).includes(0)) throw ExtractError.leftOut("not text");
  const text = decodeCode(bytes);
  check(text, SOURCE_EXTENSIONS.has(ext));
  return { pieces: lines(text, options.codeStretch), title, repo, lines: lineCount(text), cells: null };
}

const GENERATED_MARKS = [
  "DO NOT EDIT",
  "@generated",
  "Code generated by",
  "Autogenerated by",
  "Generated by the protocol",
];

/** Code that's no use to read: it holds a private key, or (`source`: code, not a repo's notes) a program wrote it
 *  (its generator says so at the top) or it's minified. Throws `ExtractError.leftOut`. */
export function check(text: string, source: boolean): void {
  if (holdsPrivateKey(text)) throw ExtractError.leftOut("holds a private key");
  if (!source) return;
  const top = graphemePrefix(text, 1000);
  for (const mark of GENERATED_MARKS) {
    if (top.includes(mark)) throw ExtractError.leftOut(`made by a program (“${mark}”)`);
  }
  // Minified: few lines, and long ones (a bundle can be one line of 100,000 characters). Swift splits at "\n"
  // Characters only, so a CRLF file is one piece here.
  const perLine = Math.trunc(graphemeCount(text) / Math.max(1, lineCount(text)));
  if (perLine > 300 && text.split(/(?<!\r)\n/).some((piece) => graphemeCount(piece) > 3000)) {
    throw ExtractError.leftOut(`minified (${perLine} characters a line)`);
  }
}

/** Newlines, plus one for a last line without one. Swift's `hasSuffix("\n")` is false after "\r\n" (one Character),
 *  so a CRLF file counts one more. */
export function lineCount(text: string): number {
  let count = 0;
  for (let at = text.indexOf("\n"); at >= 0; at = text.indexOf("\n", at + 1)) count++;
  const endsWithNewline = text.endsWith("\n") && !text.endsWith("\r\n");
  return endsWithNewline || text === "" ? count : count + 1;
}

// ---------------------------------------------------------------------------------------------------------------
// Stretches of lines
// ---------------------------------------------------------------------------------------------------------------

/** Lines that close a block (shell, Ruby, Lua, Objective-C, the C preprocessor). */
const CLOSERS: ReadonlySet<string> = new Set(["end", "fi", "done", "esac", "@end", "#endif", "end;", "end)"]);

/**
 * Stretches of whole lines, each at most `size` characters (a longer line is a stretch of its own). A stretch ends,
 * when it can, where the code does: before a line that starts a new block at the left margin, or after a blank line,
 * in its last 60%. One that had to stop in the middle of a block hands its last two lines on to the next.
 */
export function lines(text: string, size = 1800): CodePiece[] {
  const all = splitLines(text);
  if (all[all.length - 1] === "") all.pop(); // the final newline
  const count = all.length;
  const offsets = [0]; // characters before each line (each with its newline)
  for (const line of all) offsets.push(offsets[offsets.length - 1] + graphemeCount(line) + 1);
  const blank = (line: number) => isBlank(all[line]);
  const startsBlock = (line: number) => {
    const text = all[line];
    if (text === "" || isWhiteSpace(text.codePointAt(0)!)) return false;
    // A closing line belongs to the block above it.
    const first = new Graphemes(text).at(0);
    return !(first === "}" || first === ")" || first === "]") && !CLOSERS.has(trimWhitespace(text));
  };

  const pieces: CodePiece[] = [];
  let start = 0;
  while (start < count) {
    while (start < count && blank(start)) start++;
    if (start >= count) break;
    let end = start + 1; // the stretch is all[start..<end]
    while (end < count && offsets[end + 1] - offsets[start] <= size) end++;
    let natural = end >= count;
    if (!natural) {
      // Where the code breaks by itself, keeping at least 40% of a stretch: a new block after a blank line first,
      // then any blank line or new block.
      const floor = offsets[start] + Math.trunc((size * 2) / 5);
      const lastBreak = (isBreak: (line: number) => boolean): number | null => {
        for (let line = end; line > start + 1 && offsets[line] >= floor; line--) if (isBreak(line)) return line;
        return null;
      };
      const cut =
        lastBreak((line) => startsBlock(line) && blank(line - 1)) ??
        lastBreak((line) => blank(line - 1) || startsBlock(line));
      if (cut !== null) {
        end = cut;
        natural = true;
      }
    }
    let last = end;
    while (last > start + 1 && blank(last - 1)) last--; // blank lines at its end don't count
    let body = all.slice(start, last).join("\n");
    if (graphemeCount(body) > LONGEST_PIECE) body = graphemePrefix(body, LONGEST_PIECE);
    pieces.push({ text: body, first: start + 1, last });
    start = natural ? end : Math.max(end - 2, start + 1);
  }
  return pieces;
}

// prettier-ignore
const DEFINITION_SKIPPED_STARTS = [
  "//", "#", "/*", "*", "--", '"""', "import ", "from ", "#include", "using ", "package ", "}", ")", "@",
];

/** A stretch in one line, for result lists: its first line that defines something ("def retry_with_backoff(…"),
 *  else its first line of code (not a comment, an import or a closing brace). */
export function summary(text: string): string {
  const shown = text
    .split(/\r?\n/)
    .map(trimWhitespace)
    .filter((line) => line !== "");
  const definition = shown.find((line) => words(line).slice(0, 4).some(definesSomething));
  const code = shown.find((line) => !DEFINITION_SKIPPED_STARTS.some((start) => hasPrefix(line, start)));
  const line = definition ?? code ?? shown[0] ?? "";
  return graphemeCount(line) > 160 ? graphemePrefix(line, 160) + "…" : line;
}

// ---------------------------------------------------------------------------------------------------------------
// Notebooks
// ---------------------------------------------------------------------------------------------------------------

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cellList = (value: unknown): Record<string, unknown>[] | null =>
  Array.isArray(value) && value.every(isObject) ? value : null;

/** The cells of a Jupyter notebook, code and notes alike, as their text. Outputs (pictures, tables, logs) aren't
 *  read: they're results, not what anyone wrote. nbformat 4 keeps its cells at the top; nbformat 3 inside
 *  worksheets, with code in "input". */
export function notebookCells(bytes: Uint8Array): string[] {
  let notebook: unknown;
  try {
    const text = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf8");
    notebook = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    notebook = null;
  }
  if (!isObject(notebook)) throw ExtractError.unreadable("not a notebook");
  const list = cellList(notebook.cells) ?? cellList(cellList(notebook.worksheets)?.[0]?.cells) ?? [];
  return list.map((cell) => {
    const source = cell.source !== undefined ? cell.source : cell.input;
    if (Array.isArray(source) && source.every((line) => typeof line === "string")) return source.join("");
    return typeof source === "string" ? source : "";
  });
}

/** Whole cells to a stretch, up to `size` characters; a longer cell is cut into stretches of lines that all point at
 *  it. Empty cells are passed over (cell numbers count them). */
export function cells(cellTexts: readonly string[], size = 1800): CodePiece[] {
  const pieces: CodePiece[] = [];
  let text = "";
  let first = 0;
  let last = 0;
  const flush = () => {
    if (text === "") return;
    pieces.push({ text, first, last });
    text = "";
  };
  cellTexts.forEach((cell, index) => {
    const body = trimWhitespaceAndNewlines(cell);
    if (body === "") return;
    const number = index + 1;
    const length = graphemeCount(body);
    if (length > size) {
      flush();
      for (const piece of lines(body, size)) pieces.push({ text: piece.text, first: number, last: number });
      return;
    }
    if (text !== "" && graphemeCount(text) + 2 + length > size) flush();
    if (text === "") {
      first = number;
      text = body;
    } else {
      text += "\n\n" + body;
    }
    last = number;
  });
  flush();
  return pieces;
}

// ---------------------------------------------------------------------------------------------------------------
// Where it is
// ---------------------------------------------------------------------------------------------------------------

/** Whether a folder holds a repo (`.git`) or a code project. Remembered in `repos` when given. */
function isRepo(folder: string, repos?: Map<string, boolean>): boolean {
  let answer = repos?.get(folder);
  if (answer === undefined) {
    answer = existsSync(folder + "/.git") || isProjectRootFolder(folder);
    repos?.set(folder, answer);
  }
  return answer;
}

/**
 * The repo (or code project) `path` is in, and the file's title: its path from the repo's folder, the repo's name
 * first. Outside any: its folder's name and its own. The search stops below the home folder. Each folder above the
 * file is looked at on disk (a listing for the project files), so a crawl passes one `repos` map (folder → whether it's
 * a repo) for all its files: a folder of 20,000 files is then listed once, not 20,000 times.
 *
 * The title is in Foundation's file-system form, as DigUp's is (it reads `url.path`): it goes into the embedded text.
 * The repo stays as the path is stored, so the UI can match it against the file's path.
 */
export function place(
  path: string,
  home = homedir(),
  repos?: Map<string, boolean>,
): { repo: string | null; title: string } {
  const homeForm = fileSystemForm(home);
  const isHome = (folder: string) => folder === home || fileSystemForm(folder) === homeForm;
  for (let folder = parentPath(path); folder.length > 1 && !isHome(folder); folder = parentPath(folder)) {
    if (isRepo(folder, repos)) {
      return { repo: folder, title: fileSystemForm(path.slice(parentPath(folder).length + 1)) };
    }
  }
  const components = path.startsWith("/") ? ["/", ...path.split("/").filter((part) => part !== "")] : path.split("/");
  return { repo: null, title: fileSystemForm(components.slice(-2).join("/")) };
}

// prettier-ignore
const LANGUAGES: Readonly<Record<string, string>> = {
  py: "Python", pyi: "Python", pyx: "Cython", ipynb: "Notebook", c: "C", h: "C header",
  cc: "C++", cpp: "C++", cxx: "C++", hpp: "C++ header", hh: "C++ header", hxx: "C++ header",
  m: "Objective-C", mm: "Objective-C++", swift: "Swift", ts: "TypeScript", tsx: "TypeScript",
  mts: "TypeScript", cts: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript",
  cjs: "JavaScript", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", kts: "Kotlin",
  scala: "Scala", groovy: "Groovy", rb: "Ruby", php: "PHP", cs: "C#", fs: "F#", sh: "Shell",
  bash: "Shell", zsh: "Shell", fish: "Shell", ps1: "PowerShell", lua: "Lua", pl: "Perl",
  pm: "Perl", r: "R", jl: "Julia", dart: "Dart", sql: "SQL", vue: "Vue", svelte: "Svelte",
  astro: "Astro", html: "HTML", htm: "HTML", css: "CSS", scss: "SCSS", sass: "Sass",
  less: "Less", gradle: "Gradle", cmake: "CMake", mk: "Makefile", proto: "Protocol Buffers",
  graphql: "GraphQL", gql: "GraphQL", tf: "Terraform", hcl: "HCL", nix: "Nix", zig: "Zig",
  hs: "Haskell", ex: "Elixir", exs: "Elixir", erl: "Erlang", clj: "Clojure", cljs: "ClojureScript",
  elm: "Elm", ml: "OCaml", mli: "OCaml", vim: "Vim script", el: "Emacs Lisp", lisp: "Lisp",
  asm: "Assembly", s: "Assembly", metal: "Metal", glsl: "GLSL", hlsl: "HLSL", wgsl: "WGSL",
  cu: "CUDA", cuh: "CUDA", ino: "Arduino", v: "Verilog", sv: "SystemVerilog", tex: "LaTeX",
  md: "Markdown", markdown: "Markdown", rst: "reStructuredText", adoc: "AsciiDoc", org: "Org",
  txt: "Text", yaml: "YAML", yml: "YAML", toml: "TOML",
};

/** "Swift", "Python", "Markdown": what a file's extension says it's written in. */
export function language(path: string): string {
  const name = lastPathComponent(path);
  const ext = lowercased(pathExtension(name));
  if (Object.hasOwn(LANGUAGES, ext)) return LANGUAGES[ext];
  if (CODE_FILE_NAMES.has(name) || hasPrefix(name, "Dockerfile")) return name;
  return ext === "" ? "Text" : ext.toUpperCase();
}

// ---------------------------------------------------------------------------------------------------------------
// CodeLookup: names in code
// ---------------------------------------------------------------------------------------------------------------

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*(?:(?:\.|::|->|#)[A-Za-z_$][A-Za-z0-9_$]*)*$/;

/** The words keyword search keeps a name from code as ("quantize_row_q8_0_ref" → quantize row q8 0 ref, as one
 *  phrase), when the query is one: snake_case, camelCase, dotted, or with digits. Null for words anyone would say
 *  ("retry", "Renamer"), which are searched as words and by meaning. */
export function identifier(query: string): string[] | null {
  let name = trimWhitespaceAndNewlines(query);
  if (name.endsWith("()")) name = name.slice(0, -2);
  if (!IDENTIFIER.test(name)) return null;
  const camel = /[A-Z]/.test(name.slice(1)) && /[a-z]/.test(name);
  if (!camel && !/[_.:#$0-9]/.test(name)) return null;
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((word) => word !== "");
}

/** The keyword search pattern for an identifier's words: one phrase, so they match only side by side, as written. */
export function phrase(words: readonly string[]): string {
  return `"${words.join(" ")}"`;
}

// prettier-ignore
const DEFINERS: ReadonlySet<string> = new Set([
  "def", "func", "fn", "fun", "function", "class", "struct", "enum", "protocol", "interface", "trait", "type",
  "typealias", "actor", "extension", "impl", "module", "namespace", "object", "record", "macro", "const", "let",
  "var", "val", "union", "mod", "sub", "@interface", "@implementation", "@protocol", "#define", "function*",
]);
/** Words before a name that mean it's being used, not defined ("await name(…)", "return name(…)"). */
// prettier-ignore
const USERS: ReadonlySet<string> = new Set([
  "return", "await", "yield", "throw", "new", "else", "case", "print", "echo", "assert", "not", "and", "or", "in",
  "is", "do", "go", "defer", "try", "catch", "if", "while", "for", "typeof", "delete", "raise", "import", "from",
]);

/** A word that starts a definition ("def", "func", "class", "@implementation"…); not let, var, const or val. */
export function definesSomething(word: string): boolean {
  return DEFINERS.has(word) && word !== "let" && word !== "var" && word !== "const" && word !== "val";
}

function definitionStrength(before: string, after: string, line: string): number {
  const previous = words(before).at(-1) ?? "";
  if (DEFINERS.has(previous)) return 2;
  if (hasPrefix(before, "func (") && before.endsWith(")")) return 2; // a Go method
  if (hasPrefix(before, "- (") || hasPrefix(before, "+ (")) {
    // an Objective-C method
    return after === "" || [":", "{", ";"].some((start) => hasPrefix(after, start)) ? 2 : 0;
  }
  // C-style: "static void name(…) {", "struct gguf_context * name(…)", not a call or an assignment.
  if (!hasPrefix(after, "(") || before === "" || USERS.has(previous)) return 0;
  if (/[=(,.!?]/.test(before) || before.includes("->")) return 0;
  const characters = new Graphemes(before);
  const last = characters.at(characters.count - 1);
  if (!(LETTER_OR_NUMBER.test(last) || ["*", "&", ">", "_", "]"].includes(last))) return 0;
  return trimWhitespace(line).endsWith(";") ? 1 : 2;
}

/** Where `name` is in `line` as a whole name (not a part of a longer one), whatever its case and its normalization.
 *  UTF-16 ranges of the line as written, of whole Characters, as Foundation's search finds them. */
export function occurrences(name: string, line: string): Array<{ start: number; end: number }> {
  if (name === "") return [];
  const found: Array<{ start: number; end: number }> = [];
  const characters = new Graphemes(line);
  const { text, owner } = composed(characters, true);
  const pattern = new RegExp(foldWide(name.normalize("NFC")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
  for (const match of text.matchAll(pattern)) {
    const after = match.index + match[0].length;
    if (!isWhole(text, owner, match.index, after)) continue;
    const first = owner(match.index);
    const next = owner(after - 1) + 1;
    const clearBefore = first === 0 || !isNameCharacter(characters.at(first - 1));
    const clearAfter = next === characters.count || !isNameCharacter(characters.at(next));
    if (clearBefore && clearAfter) found.push({ start: characters.start(first), end: characters.start(next) });
  }
  return found;
}

/**
 * Where `name` is defined in `text` (a stretch whose first line is `first`): the line, and how surely. 2 after a word
 * that defines something (def, func, class, function, struct, #define, @implementation…) or as a C-style definition (a
 * type before it, its parameters after it, no "=" or call around it); 1 for a declaration (the same, ending in ";").
 * Null when the stretch only uses it.
 */
export function definition(name: string, text: string, first: number): { line: number; strength: number } | null {
  let best: { line: number; strength: number } | null = null;
  const all = splitLines(text);
  for (let offset = 0; offset < all.length; offset++) {
    const line = all[offset];
    for (const range of occurrences(name, line)) {
      const before = trimWhitespace(line.slice(0, range.start));
      const after = trimWhitespace(line.slice(range.end));
      const strength = definitionStrength(before, after, line);
      if (strength > (best?.strength ?? 0)) best = { line: first + offset, strength };
      if (strength === 2) return best;
    }
  }
  return best;
}

/** How comments and docstrings start. */
const COMMENT_STARTS = ["//", "#", "/*", "*", "--", '"""', "'''", "<!--", ";"];

/** Whether `line` has `word` (lowercased) as a word or as the start of a name's part: at the line's start, after
 *  something that isn't a letter or a digit, or at a capital letter (camelCase). */
function has(word: string, line: string): boolean {
  const lowerCharacters = new Graphemes(lowercased(line));
  const lineCharacters = new Graphemes(line);
  const { text, owner } = composed(lowerCharacters);
  const needle = word.normalize("NFC");
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) {
    if (!isWhole(text, owner, at, at + needle.length)) continue;
    const index = owner(at);
    if (index === 0 || !LETTER_OR_NUMBER.test(lowerCharacters.at(index - 1))) return true;
    if (index < lineCharacters.count && isUppercase(lineCharacters.at(index))) return true;
  }
  return false;
}

/** The line (from `first`) to open at for `words`: the first line with one of them that defines something ("def
 *  retry_with_backoff"), else the first such line of code (not a comment), else the first such line. A word counts as
 *  itself or as a part of a name (the "retry" of retryWithBackoff and retry_with_backoff). Null when none is there. */
export function firstLine(wordList: readonly string[], text: string, first: number): number | null {
  const wanted = wordList.filter((word) => graphemeCount(word) >= 2).map(lowercased);
  if (wanted.length === 0) return null;
  let firstCode: number | null = null;
  let firstAny: number | null = null;
  const all = splitLines(text);
  for (let offset = 0; offset < all.length; offset++) {
    const line = all[offset];
    if (!wanted.some((word) => has(word, line))) continue;
    const trimmed = trimWhitespace(line);
    if (words(trimmed).slice(0, 4).some(definesSomething)) return first + offset;
    if (firstCode === null && !COMMENT_STARTS.some((start) => hasPrefix(trimmed, start))) firstCode = offset;
    if (firstAny === null) firstAny = offset;
  }
  const found = firstCode ?? firstAny;
  return found === null ? null : first + found;
}

// DigUp's names, for readers of the Swift.
export const CodeExtractor = {
  read: readCode,
  check,
  lineCount,
  lines,
  summary,
  notebookCells,
  cells,
  place,
  language,
};
export const CodeLookup = { identifier, phrase, definition, definesSomething, firstLine, occurrences };
