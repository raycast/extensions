import { basename } from "node:path";
import type { SearchError, SearchOptions } from "../types/search.ts";

/** One match inside a single file, before it is mapped to a `SearchResult`. */
export interface FileMatch {
  /** 1-based line number. */
  line: number;
  /** 1-based column. UTF-16 offsets — ripgrep reports byte offsets (documented divergence). */
  column: number;
  lineText: string;
  contextBefore?: string[];
  contextAfter?: string[];
}

export interface QueryMatcher {
  /** Global regex; callers reset `lastIndex` per input. */
  regex: RegExp;
  /** True means whole-content scanning; false means per-line scanning. */
  multiline: boolean;
  invert: boolean;
}

export interface ScanBounds {
  contextBefore: number;
  contextAfter: number;
  maxMatches: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compiles the query for the Node.js fallback engine, mirroring the ripgrep
 * flag semantics exposed by `SearchOptions`. Documented divergences from
 * ripgrep: JS regex dialect instead of Rust's, UTF-16 columns instead of byte
 * offsets, ASCII-oriented `\w` word boundaries, and smart-case seeing the
 * uppercase letter inside escape sequences such as `\W`.
 * Throws an `invalid-query` `SearchError` when the pattern cannot compile.
 */
export function compileQueryMatcher(query: string, options: SearchOptions): QueryMatcher {
  const insensitive = options.caseMode === "insensitive" || (options.caseMode === "smart" && !/\p{Lu}/u.test(query));
  let source = options.searchMode === "text" ? escapeRegExp(query) : query;
  if (options.wholeWord) source = `(?<!\\w)(?:${source})(?!\\w)`;
  // ponytail: invert stays per-line even with multiline on, matching rg -v line semantics.
  const multiline = options.multiline && !options.invertMatch;
  try {
    return {
      regex: new RegExp(source, `g${insensitive ? "i" : ""}${multiline ? "m" : ""}`),
      multiline,
      invert: options.invertMatch,
    };
  } catch (error) {
    const failure: SearchError = {
      kind: "invalid-query",
      message: error instanceof Error ? error.message : "Invalid regular expression.",
    };
    throw failure;
  }
}

/** Ripgrep's binary heuristic: a NUL byte in the leading bytes marks the file binary. */
export function looksBinary(data: Buffer): boolean {
  return data.subarray(0, 8192).includes(0);
}

/** Splits content into lines without terminators; a trailing newline adds no phantom line. */
export function splitLines(content: string): string[] {
  if (content.length === 0) return [];
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
}

function toMatch(lines: string[], index: number, column: number, bounds: ScanBounds): FileMatch {
  const match: FileMatch = { line: index + 1, column, lineText: lines[index] ?? "" };
  if (bounds.contextBefore > 0 && index > 0) {
    match.contextBefore = lines.slice(Math.max(0, index - bounds.contextBefore), index);
  }
  if (bounds.contextAfter > 0 && index + 1 < lines.length) {
    match.contextAfter = lines.slice(index + 1, index + 1 + bounds.contextAfter);
  }
  return match;
}

/**
 * Scans `lines[start, end)` per line. Each regex occurrence on a line becomes
 * its own match (mirroring ripgrep submatches); inverted mode emits one match
 * per non-matching line at column 1.
 */
export function scanLines(
  lines: string[],
  start: number,
  end: number,
  matcher: QueryMatcher,
  bounds: ScanBounds,
): FileMatch[] {
  const matches: FileMatch[] = [];
  for (let index = start; index < end && matches.length < bounds.maxMatches; index++) {
    const line = lines[index] ?? "";
    matcher.regex.lastIndex = 0;
    if (matcher.invert) {
      if (!matcher.regex.test(line)) matches.push(toMatch(lines, index, 1, bounds));
      continue;
    }
    let found: RegExpExecArray | null;
    while (matches.length < bounds.maxMatches && (found = matcher.regex.exec(line)) !== null) {
      matches.push(toMatch(lines, index, found.index + 1, bounds));
      if (found[0].length === 0) matcher.regex.lastIndex += 1;
    }
  }
  return matches;
}

/**
 * Whole-content scan for multiline regex mode. Reports the first spanned line
 * as the match line (ripgrep emits every spanned line — documented divergence);
 * after-context starts below the last spanned line.
 */
export function scanMultiline(
  content: string,
  lines: string[],
  matcher: QueryMatcher,
  bounds: ScanBounds,
): FileMatch[] {
  const lineStarts = [0];
  for (let offset = 0; offset < content.length; offset++) {
    if (content[offset] === "\n") lineStarts.push(offset + 1);
  }
  const lineOf = (offset: number): number => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (lineStarts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  };

  const matches: FileMatch[] = [];
  matcher.regex.lastIndex = 0;
  let found: RegExpExecArray | null;
  while (matches.length < bounds.maxMatches && (found = matcher.regex.exec(content)) !== null) {
    const startLine = lineOf(found.index);
    const endLine = found[0].length === 0 ? startLine : lineOf(found.index + found[0].length - 1);
    const match: FileMatch = {
      line: startLine + 1,
      column: found.index - lineStarts[startLine] + 1,
      lineText: lines[startLine] ?? "",
    };
    if (bounds.contextBefore > 0 && startLine > 0) {
      match.contextBefore = lines.slice(Math.max(0, startLine - bounds.contextBefore), startLine);
    }
    if (bounds.contextAfter > 0 && endLine + 1 < lines.length) {
      match.contextAfter = lines.slice(endLine + 1, endLine + 1 + bounds.contextAfter);
    }
    matches.push(match);
    if (found[0].length === 0) matcher.regex.lastIndex += 1;
  }
  return matches;
}

export interface CompiledGlob {
  regex: RegExp;
  /** Pattern had no slash → gitignore-style basename match at any depth. */
  matchBase: boolean;
}

/**
 * Minimal glob support: `*`, `**`, and `?`. Character classes and brace
 * alternation are treated literally — a documented divergence from ripgrep.
 * Returns null for patterns that cannot compile.
 */
export function compileGlob(glob: string): CompiledGlob | null {
  const pattern = glob.startsWith("/") ? glob.slice(1) : glob;
  if (pattern.length === 0) return null;
  let source = "";
  let index = 0;
  while (index < pattern.length) {
    if (pattern.startsWith("**/", index)) {
      source += "(?:[^/]+/)*";
      index += 3;
    } else if (pattern.startsWith("**", index)) {
      source += ".*";
      index += 2;
    } else if (pattern[index] === "*") {
      source += "[^/]*";
      index += 1;
    } else if (pattern[index] === "?") {
      source += "[^/]";
      index += 1;
    } else {
      source += escapeRegExp(pattern[index]);
      index += 1;
    }
  }
  try {
    return { regex: new RegExp(`^${source}$`), matchBase: !pattern.includes("/") };
  } catch {
    return null;
  }
}

export function globMatches(glob: CompiledGlob, relativePath: string): boolean {
  return glob.regex.test(glob.matchBase ? basename(relativePath) : relativePath);
}

export interface IgnoreRule {
  glob: CompiledGlob;
  dirOnly: boolean;
}

/**
 * Parses `.gitignore`-style content with the shared subset semantics: comments
 * and blank lines are skipped, and negation (`!`) rules are dropped rather
 * than approximated — a documented divergence from ripgrep.
 */
export function parseIgnoreContent(content: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith("!")) continue;
    const dirOnly = line.endsWith("/");
    const compiled = compileGlob(dirOnly ? line.slice(0, -1) : line);
    if (compiled) rules.push({ glob: compiled, dirOnly });
  }
  return rules;
}

/** `relativePath` must be relative to the directory holding the ignore file. */
export function isIgnoredByRules(rules: IgnoreRule[], relativePath: string, isDirectory: boolean): boolean {
  return rules.some((rule) => (isDirectory || !rule.dirOnly) && globMatches(rule.glob, relativePath));
}
