import fs from "fs/promises";
import { Rule } from "../types";

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface ParsedConfig {
  rules: Rule[];
  defaultBrowser?: string;
}

export async function parseFinickyConfig(configPath: string): Promise<ParsedConfig> {
  try {
    const content = await fs.readFile(configPath, "utf8");
    return parseFinickyConfigContent(content);
  } catch (error) {
    throw new Error(`Failed to read config file: ${error}`);
  }
}

/**
 * Number of handler objects in a config file, whether or not they can be parsed
 * into rules. A missing file counts as zero.
 */
export async function countConfigHandlers(configPath: string): Promise<number> {
  let content: string;
  try {
    content = await fs.readFile(configPath, "utf8");
  } catch {
    return 0;
  }
  const handlersContent = extractHandlersArrayContent(content);
  return handlersContent ? splitTopLevelObjects(handlersContent).length : 0;
}

/**
 * Turns a rule name into something safe for a single-line `// Rule:` comment.
 * Also repairs names from older imports, which picked up the `"` or `",` that
 * followed a pattern (e.g. `norm.ooo/*"`).
 */
export function cleanRuleName(name: string): string {
  return name
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/["'`]+,?$/, "")
    .trim();
}

/**
 * Robustly parse a Finicky config that looks like:
 * module.exports = { defaultBrowser: "...", handlers: [ { ... }, { ... } ] }
 *
 * Key goals:
 * - Do NOT use regex to capture the whole handlers array (it breaks on inner match arrays).
 * - Instead, locate "handlers: [" and then scan until the matching closing ']'.
 * - Split top-level handler objects by brace-depth.
 * - Skip strings, regex literals and comments while scanning, so a quote or bracket
 *   inside a comment (or a "//" inside "*://") can't throw the depth count off.
 */
export function parseFinickyConfigContent(content: string): ParsedConfig {
  const rules: Rule[] = [];
  let defaultBrowser: string | undefined;

  try {
    const defaultBrowserMatch = content.match(/defaultBrowser\s*:\s*["']([^"']+)["']/);
    if (defaultBrowserMatch) {
      defaultBrowser = defaultBrowserMatch[1];
    }

    const handlersContent = extractHandlersArrayContent(content);
    if (!handlersContent) {
      return { rules, defaultBrowser };
    }

    for (const { block, comment } of splitTopLevelObjects(handlersContent)) {
      const rule = parseHandlerBlock(block, comment);
      if (rule) {
        rules.push(rule);
      }
    }
  } catch (error) {
    console.error("Error parsing Finicky config:", error);
  }

  return { rules, defaultBrowser };
}

function extractHandlersArrayContent(content: string): string | null {
  // Find a "handlers:" key outside of strings and comments, then the first '[' after it.
  let i = 0;
  let handlersKeyIndex = -1;
  while (i < content.length) {
    const literal = skipLiteral(content, i);
    if (literal) {
      i = literal.end;
      continue;
    }
    if (/^handlers\s*:/.test(content.slice(i, i + 40)) && !/[\w$]/.test(content[i - 1] ?? "")) {
      handlersKeyIndex = i;
      break;
    }
    i++;
  }
  if (handlersKeyIndex === -1) return null;

  const openBracketIndex = content.indexOf("[", handlersKeyIndex);
  if (openBracketIndex === -1) return null;

  const closeBracketIndex = findMatchingBracket(content, openBracketIndex, "[", "]");
  if (closeBracketIndex === -1) return null;

  return content.slice(openBracketIndex + 1, closeBracketIndex);
}

type Literal = { end: number; kind: "line-comment" | "block-comment" | "string" | "regex" };

/**
 * If a string, template, regex literal or comment starts at `i`, returns the index
 * just past its end. Returns null for ordinary code.
 */
function skipLiteral(text: string, i: number): Literal | null {
  const c = text[i];
  const next = text[i + 1];

  if (c === "/" && next === "/") {
    const newline = text.indexOf("\n", i);
    return { end: newline === -1 ? text.length : newline, kind: "line-comment" };
  }

  if (c === "/" && next === "*") {
    const close = text.indexOf("*/", i + 2);
    return { end: close === -1 ? text.length : close + 2, kind: "block-comment" };
  }

  if (c === '"' || c === "'" || c === "`") {
    let j = i + 1;
    while (j < text.length) {
      if (text[j] === "\\") {
        j += 2;
        continue;
      }
      if (text[j] === c) return { end: j + 1, kind: "string" };
      // An unterminated ' or " string ends at the line break, as in JS.
      if (c !== "`" && text[j] === "\n") return { end: j, kind: "string" };
      j++;
    }
    return { end: text.length, kind: "string" };
  }

  // Very light regex literal detection: a '/' that follows something an
  // expression can start after, including the '>' of an arrow function
  // (`({ urlString }) => /.../.test(urlString)`). Good enough for typical Finicky configs.
  if (c === "/") {
    const prevNonSpace = findPrevNonSpace(text, i - 1);
    if (prevNonSpace === "" || /[=(:[{},!&|?;>]/.test(prevNonSpace)) {
      let j = i + 1;
      let inClass = false;
      while (j < text.length && text[j] !== "\n") {
        const ch = text[j];
        if (ch === "\\") {
          j += 2;
          continue;
        }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) {
          j++;
          while (j < text.length && /[a-z]/i.test(text[j])) j++;
          return { end: j, kind: "regex" };
        }
        j++;
      }
      // No closing '/' on this line, so it was a division operator after all.
      return null;
    }
  }

  return null;
}

function findMatchingBracket(text: string, openIndex: number, openChar: string, closeChar: string): number {
  let depth = 0;

  let i = openIndex;
  while (i < text.length) {
    const literal = skipLiteral(text, i);
    if (literal) {
      i = literal.end;
      continue;
    }

    const c = text[i];
    if (c === openChar) depth++;
    if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }

  return -1;
}

function findPrevNonSpace(text: string, fromIndex: number): string {
  for (let i = fromIndex; i >= 0; i--) {
    const c = text[i];
    if (!/\s/.test(c)) return c;
  }
  return "";
}

/**
 * Splits the handlers array into its top-level objects. Each object comes with
 * the last line comment that appeared before it at the top level, which is where
 * the generator writes `// Rule: <name>`.
 */
function splitTopLevelObjects(arrayContent: string): { block: string; comment?: string }[] {
  const blocks: { block: string; comment?: string }[] = [];

  let depth = 0;
  let start = -1;
  let pendingComment: string | undefined;

  let i = 0;
  while (i < arrayContent.length) {
    const literal = skipLiteral(arrayContent, i);
    if (literal) {
      if (depth === 0 && literal.kind === "line-comment") {
        pendingComment = arrayContent.slice(i + 2, literal.end);
      }
      i = literal.end;
      continue;
    }

    const c = arrayContent[i];
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push({ block: arrayContent.slice(start, i + 1), comment: pendingComment });
        start = -1;
        pendingComment = undefined;
      }
    }
    i++;
  }

  return blocks;
}

/**
 * The first line comment inside a handler block, for hand-written configs that
 * put the description inside the braces.
 */
function firstInnerComment(block: string): string | undefined {
  let i = 0;
  while (i < block.length) {
    const literal = skipLiteral(block, i);
    if (literal) {
      if (literal.kind === "line-comment") return block.slice(i + 2, literal.end);
      i = literal.end;
      continue;
    }
    i++;
  }
  return undefined;
}

/**
 * Source of the first regex literal in a block that is followed by `.test(`,
 * scanned with skipLiteral so escaped slashes (`/^https:\/\//`) stay intact.
 */
function findTestedRegexLiteral(block: string): string | undefined {
  let i = 0;
  while (i < block.length) {
    const literal = skipLiteral(block, i);
    if (!literal) {
      i++;
      continue;
    }
    if (literal.kind === "regex" && /^\s*\.\s*test\s*\(/.test(block.slice(literal.end))) {
      const source = block.slice(i, literal.end);
      return source.slice(1, source.lastIndexOf("/"));
    }
    i = literal.end;
  }
  return undefined;
}

function ruleNameFromComment(comment: string | undefined): string | undefined {
  if (!comment) return undefined;
  const name = cleanRuleName(comment.replace(/^\s*Rule:\s*/, ""));
  return name || undefined;
}

/**
 * Extract quoted string literals from the inside of an array like
 *   "a", "b[0-9]", 'c'
 * Respects escape sequences and matched quote types so patterns containing
 * commas or ']' characters are preserved verbatim.
 */
function splitTopLevelStrings(arrayContent: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < arrayContent.length) {
    const c = arrayContent[i];
    if (c === "/" && (arrayContent[i + 1] === "/" || arrayContent[i + 1] === "*")) {
      i = skipLiteral(arrayContent, i)?.end ?? i + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let value = "";
      i++; // skip opening quote
      while (i < arrayContent.length) {
        const ch = arrayContent[i];
        if (ch === "\\" && i + 1 < arrayContent.length) {
          value += arrayContent[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) {
          i++; // skip closing quote
          break;
        }
        value += ch;
        i++;
      }
      out.push(value);
      continue;
    }
    i++;
  }
  return out;
}

function parseHandlerBlock(block: string, leadingComment?: string): Rule | null {
  try {
    const name =
      ruleNameFromComment(leadingComment) ?? ruleNameFromComment(firstInnerComment(block)) ?? "Imported Rule";

    // Support both browser: "App" and browser: { name: "App", ... }
    const browserMatch = block.match(/browser\s*:\s*["']([^"']+)["']/);
    let browser = browserMatch?.[1];

    if (!browser) {
      const browserObjectMatch = /\bbrowser\s*:\s*\{/.exec(block);
      if (browserObjectMatch) {
        const openBraceIndex = block.indexOf("{", browserObjectMatch.index);
        const closeBraceIndex = findMatchingBracket(block, openBraceIndex, "{", "}");
        if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
          const browserObjectContent = block.slice(openBraceIndex + 1, closeBraceIndex);
          const browserNameMatch = browserObjectContent.match(/name\s*:\s*["']([^"']+)["']/);
          if (browserNameMatch) {
            browser = browserNameMatch[1];
          }
        }
      }
    }

    if (!browser) {
      return null;
    }

    const singleStringMatch = block.match(/\bmatch\s*:\s*["']([^"']+)["']/);
    if (singleStringMatch) {
      return {
        id: uuid(),
        name,
        enabled: true,
        matchType: "wildcards",
        patterns: [singleStringMatch[1]],
        browser,
      };
    }

    // match: [ "a", "b" ] — use bracket-aware scanning so patterns containing
    // ']' (e.g. "*://example.com/path[0-9]*") aren't truncated.
    const matchKeyRegex = /\bmatch\s*:\s*\[/;
    const matchKeyResult = matchKeyRegex.exec(block);
    if (matchKeyResult) {
      const openBracketIndex = block.indexOf("[", matchKeyResult.index);
      const closeBracketIndex = findMatchingBracket(block, openBracketIndex, "[", "]");
      if (openBracketIndex !== -1 && closeBracketIndex !== -1) {
        const patternsContent = block.slice(openBracketIndex + 1, closeBracketIndex);
        const patterns = splitTopLevelStrings(patternsContent);

        if (patterns.length > 0) {
          return {
            id: uuid(),
            name,
            enabled: true,
            matchType: "wildcards",
            patterns,
            browser,
          };
        }
      }
    }

    // match: (...) => new RegExp("...", "i").test(...)
    const matchFunctionMatch = block.match(
      /match\s*:\s*(?:\([^)]*\)\s*=>|function\s*\([^)]*\))\s*(?:new\s+RegExp\s*\(\s*["']([^"']+)["'])/,
    );
    if (matchFunctionMatch) {
      const regexPattern = matchFunctionMatch[1];
      return {
        id: uuid(),
        name,
        enabled: true,
        matchType: "regex",
        patterns: [regexPattern],
        browser,
      };
    }

    // match: ({ urlString }) => /.../i.test(urlString)
    const regexPattern = findTestedRegexLiteral(block);
    if (regexPattern) {
      return {
        id: uuid(),
        name,
        enabled: true,
        matchType: "regex",
        patterns: [regexPattern],
        browser,
      };
    }

    return null;
  } catch (error) {
    console.error("Error parsing handler block:", error);
    return null;
  }
}
