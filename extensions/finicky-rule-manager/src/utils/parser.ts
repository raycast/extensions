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
 * Robustly parse a Finicky config that looks like:
 * module.exports = { defaultBrowser: "...", handlers: [ { ... }, { ... } ] }
 *
 * Key goals:
 * - Do NOT use regex to capture the whole handlers array (it breaks on inner match arrays).
 * - Instead, locate "handlers: [" and then scan until the matching closing ']'.
 * - Split top-level handler objects by brace-depth.
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

    const handlerBlocks = splitTopLevelObjects(handlersContent);

    for (const block of handlerBlocks) {
      const rule = parseHandlerBlock(block);
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
  // Find "handlers" then the first '[' after it, then scan to its matching ']'.
  const handlersKeyIndex = content.search(/\bhandlers\s*:/);
  if (handlersKeyIndex === -1) return null;

  const openBracketIndex = content.indexOf("[", handlersKeyIndex);
  if (openBracketIndex === -1) return null;

  const closeBracketIndex = findMatchingBracket(content, openBracketIndex, "[", "]");
  if (closeBracketIndex === -1) return null;

  return content.slice(openBracketIndex + 1, closeBracketIndex);
}

function findMatchingBracket(text: string, openIndex: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inRegex = false;
  let escaping = false;

  for (let i = openIndex; i < text.length; i++) {
    const c = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    if (escaping) {
      escaping = false;
      continue;
    }

    // Escape handling inside strings/templates/regex
    if (c === "\\") {
      escaping = true;
      continue;
    }

    // Toggle string/template states (but not inside regex)
    if (!inRegex) {
      if (!inDouble && !inTemplate && c === "'" && !inSingle) {
        inSingle = true;
        continue;
      } else if (inSingle && c === "'") {
        inSingle = false;
        continue;
      }

      if (!inSingle && !inTemplate && c === '"' && !inDouble) {
        inDouble = true;
        continue;
      } else if (inDouble && c === '"') {
        inDouble = false;
        continue;
      }

      if (!inSingle && !inDouble && c === "`" && !inTemplate) {
        inTemplate = true;
        continue;
      } else if (inTemplate && c === "`") {
        inTemplate = false;
        continue;
      }
    }

    // Very light regex literal detection:
    // If we see a '/' that looks like it could start a regex and we aren't in a string/template.
    // This isn't perfect, but good enough for typical Finicky configs.
    if (!inSingle && !inDouble && !inTemplate) {
      if (!inRegex && c === "/" && prev !== "/" && prev !== "*") {
        // Heuristic: treat as regex start only if previous non-space char is one of these
        const prevNonSpace = findPrevNonSpace(text, i - 1);
        if (prevNonSpace === "" || /[=(:[{},!&|?;]/.test(prevNonSpace)) {
          inRegex = true;
          continue;
        }
      } else if (inRegex && c === "/") {
        inRegex = false;
        continue;
      }
    }

    // If inside any literal, ignore structural chars
    if (inSingle || inDouble || inTemplate || inRegex) continue;

    if (c === openChar) depth++;
    if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
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

function splitTopLevelObjects(arrayContent: string): string[] {
  const blocks: string[] = [];

  let depth = 0;
  let start = -1;

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inRegex = false;
  let escaping = false;

  for (let i = 0; i < arrayContent.length; i++) {
    const c = arrayContent[i];
    const prev = i > 0 ? arrayContent[i - 1] : "";

    if (escaping) {
      escaping = false;
      continue;
    }
    if (c === "\\") {
      escaping = true;
      continue;
    }

    if (!inRegex) {
      if (!inDouble && !inTemplate && c === "'" && !inSingle) {
        inSingle = true;
        continue;
      } else if (inSingle && c === "'") {
        inSingle = false;
        continue;
      }

      if (!inSingle && !inTemplate && c === '"' && !inDouble) {
        inDouble = true;
        continue;
      } else if (inDouble && c === '"') {
        inDouble = false;
        continue;
      }

      if (!inSingle && !inDouble && c === "`" && !inTemplate) {
        inTemplate = true;
        continue;
      } else if (inTemplate && c === "`") {
        inTemplate = false;
        continue;
      }
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (!inRegex && c === "/" && prev !== "/" && prev !== "*") {
        const prevNonSpace = findPrevNonSpace(arrayContent, i - 1);
        if (prevNonSpace === "" || /[=(:[{},!&|?;]/.test(prevNonSpace)) {
          inRegex = true;
          continue;
        }
      } else if (inRegex && c === "/") {
        inRegex = false;
        continue;
      }
    }

    if (inSingle || inDouble || inTemplate || inRegex) continue;

    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (c === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(arrayContent.slice(start, i + 1));
        start = -1;
      }
      continue;
    }
  }

  return blocks;
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

function parseHandlerBlock(block: string): Rule | null {
  try {
    const nameMatch = block.match(/\/\/\s*(?:Rule:\s*)?([^\n]+)/);
    const name = nameMatch ? nameMatch[1].trim() : "Imported Rule";

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
    const matchTestMatch = block.match(/\/([^/]+)\/[igm]*\.test\(/);
    if (matchTestMatch) {
      const regexPattern = matchTestMatch[1];
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
