interface FenceState {
  character: string;
  count: number;
}

interface ListMatch {
  indent: string;
  indentCount: number;
  marker: string;
  content: string;
}

interface ListItem {
  indent: string;
  indentCount: number;
  marker: string;
  parts: string[];
}

export const MarkdownReformatter = {
  isLikelyMarkdown(text: string): boolean {
    const analysis = analyze(text);
    if (analysis.listCount >= 2) return true;
    if (analysis.headingCount >= 2) return true;
    if (analysis.headingCount >= 1 && analysis.listCount >= 1) return true;
    return false;
  },

  reformat(text: string): string {
    const normalized = normalizeLineEndings(text);
    const lines = normalized.split("\n");
    const output: string[] = [];
    let paragraphParts: string[] = [];
    let listItem: ListItem | undefined;
    let fence: FenceState | undefined;

    const flushParagraph = () => {
      if (paragraphParts.length === 0) return;
      output.push(joinParts(paragraphParts));
      paragraphParts = [];
    };

    const flushListItem = () => {
      if (!listItem) return;
      const merged = joinParts(listItem.parts);
      output.push(`${listItem.indent}${listItem.marker} ${merged}`);
      listItem = undefined;
    };

    for (const line of lines) {
      if (fence) {
        output.push(line);
        if (isFenceClose(line, fence)) fence = undefined;
        continue;
      }

      const opened = fenceOpen(line);
      if (opened) {
        flushParagraph();
        flushListItem();
        output.push(line);
        fence = opened;
        continue;
      }

      if (line.trim().length === 0) {
        flushParagraph();
        flushListItem();
        output.push("");
        continue;
      }

      if (isHeadingLine(line)) {
        flushParagraph();
        flushListItem();
        output.push(trimTrailingWhitespace(line));
        continue;
      }

      const match = listMatch(line);
      if (match) {
        flushParagraph();
        flushListItem();
        listItem = {
          indent: match.indent,
          indentCount: match.indentCount,
          marker: match.marker,
          parts: [match.content],
        };
        continue;
      }

      if (listItem) {
        const indentCount = leadingWhitespace(line).indentCount;
        if (indentCount > listItem.indentCount) {
          listItem.parts.push(line.trim());
        } else {
          flushListItem();
          paragraphParts.push(line.trim());
        }
        continue;
      }

      paragraphParts.push(line.trim());
    }

    flushListItem();
    flushParagraph();
    return output.join("\n");
  },
};

function analyze(text: string): { headingCount: number; listCount: number } {
  const lines = normalizeLineEndings(text).split("\n");
  let headingCount = 0;
  let listCount = 0;
  let fence: FenceState | undefined;

  for (const line of lines) {
    if (fence) {
      if (isFenceClose(line, fence)) fence = undefined;
      continue;
    }
    const opened = fenceOpen(line);
    if (opened) {
      fence = opened;
      continue;
    }
    if (isHeadingLine(line)) {
      headingCount += 1;
      continue;
    }
    if (listMatch(line)) listCount += 1;
  }

  return { headingCount, listCount };
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function fenceOpen(line: string): FenceState | undefined {
  const trimmed = line.replace(/^[ \t]+/, "");
  const first = trimmed[0];
  if (first !== "`" && first !== "~") return undefined;
  let count = 0;
  while (trimmed[count] === first) count += 1;
  if (count < 3) return undefined;
  return { character: first, count };
}

function isFenceClose(line: string, fence: FenceState): boolean {
  const trimmed = line.replace(/^[ \t]+/, "");
  if (trimmed[0] !== fence.character) return false;
  let count = 0;
  while (trimmed[count] === fence.character) count += 1;
  return count >= fence.count;
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.replace(/^[ \t]+/, "");
  if (trimmed[0] !== "#") return false;
  let hashes = 0;
  while (trimmed[hashes] === "#") hashes += 1;
  if (hashes < 1 || hashes > 6) return false;
  const next = trimmed[hashes];
  return next === " " || next === "\t";
}

function listMatch(line: string): ListMatch | undefined {
  const { indent, indentCount } = leadingWhitespace(line);
  const rest = line.slice(indent.length);
  if (rest.length === 0) return undefined;
  const first = rest[0];
  if (first === "-" || first === "*" || first === "+" || first === "•") {
    if (rest.length < 2 || !/\s/.test(rest[1])) return undefined;
    const content = rest.slice(2).trim();
    if (!content) return undefined;
    return { indent, indentCount, marker: first, content };
  }

  let index = 0;
  let digits = "";
  while (index < rest.length && /[0-9]/.test(rest[index])) {
    digits += rest[index];
    index += 1;
  }
  if (!digits || index >= rest.length) return undefined;
  const markerChar = rest[index];
  if (markerChar !== "." && markerChar !== ")") return undefined;
  let contentStart = index + 1;
  while (contentStart < rest.length && /\s/.test(rest[contentStart])) contentStart += 1;
  if (contentStart >= rest.length) return undefined;
  const content = rest.slice(contentStart).trim();
  if (!content) return undefined;
  return { indent, indentCount, marker: digits + markerChar, content };
}

function leadingWhitespace(line: string): { indent: string; indentCount: number } {
  let count = 0;
  while (count < line.length && (line[count] === " " || line[count] === "\t")) count += 1;
  return { indent: line.slice(0, count), indentCount: count };
}

function trimTrailingWhitespace(text: string): string {
  return text.replace(/[ \t]+$/, "");
}

function joinParts(parts: string[]): string {
  let result = "";
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!result) {
      result = trimmed;
      continue;
    }
    const shouldElideSpace = result.endsWith("-") && startsWithAlphaNumeric(trimmed);
    result += shouldElideSpace ? "" : " ";
    result += trimmed;
  }
  return collapseWhitespace(result);
}

function startsWithAlphaNumeric(text: string): boolean {
  return /^[0-9A-Za-z]/.test(text);
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
