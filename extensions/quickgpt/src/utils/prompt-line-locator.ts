/**
 * Locates the line where each prompt is defined inside a prompt (h)json source
 * file, so editors can jump straight to the definition instead of just opening
 * the file.
 *
 * The hjson parser does not expose source positions, so this walks the parsed
 * prompt tree in document order and searches the raw text with a forward-only
 * cursor. Matching is best-effort: nodes that cannot be located simply get no
 * line number and callers fall back to opening the file without one.
 */

interface RawPromptNode {
  title?: unknown;
  content?: unknown;
  subprompts?: unknown;
  lineNumber?: number;
  [key: string]: unknown;
}

// Matches a `title:` key in hjson/json syntax, e.g. `title:`, `"title":`,
// `{ title:` or `, title:`.
const TITLE_KEY_PATTERN = /(^|[{,]|\s)["']?title["']?\s*:/;

function findLineIndex(lines: string[], fromIndex: number, predicate: (line: string) => boolean): number | undefined {
  for (let index = fromIndex; index < lines.length; index++) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return undefined;
}

function locateNodeLine(lines: string[], fromIndex: number, node: RawPromptNode): number | undefined {
  const title = typeof node.title === "string" ? node.title.trim() : "";

  if (title) {
    const keyedLine = findLineIndex(lines, fromIndex, (line) => line.includes(title) && TITLE_KEY_PATTERN.test(line));
    if (keyedLine !== undefined) {
      return keyedLine;
    }

    const plainLine = findLineIndex(lines, fromIndex, (line) => line.includes(title));
    if (plainLine !== undefined) {
      return plainLine;
    }
  }

  // Prompts without an explicit title derive it from the first content line,
  // which also appears verbatim in the source text.
  const contentFirstLine = typeof node.content === "string" ? (node.content.trim().split("\n")[0] ?? "").trim() : "";
  if (contentFirstLine) {
    return findLineIndex(lines, fromIndex, (line) => line.includes(contentFirstLine));
  }

  return undefined;
}

/**
 * Walks the parsed prompt tree in document order and stores a 1-based
 * `lineNumber` on every node whose definition can be located in the source
 * text. Nodes that cannot be located are left untouched.
 */
export function assignPromptLineNumbers(prompts: Record<string, unknown>[], fileText: string): void {
  const lines = fileText.split(/\r?\n/);
  let searchFromIndex = 0;

  const visit = (node: RawPromptNode): void => {
    const lineIndex = locateNodeLine(lines, searchFromIndex, node);
    if (lineIndex !== undefined) {
      node.lineNumber = lineIndex + 1;
      searchFromIndex = lineIndex + 1;
    }

    if (Array.isArray(node.subprompts)) {
      for (const subprompt of node.subprompts) {
        if (subprompt && typeof subprompt === "object") {
          visit(subprompt as RawPromptNode);
        }
      }
    }
  };

  for (const prompt of prompts) {
    visit(prompt as RawPromptNode);
  }
}
