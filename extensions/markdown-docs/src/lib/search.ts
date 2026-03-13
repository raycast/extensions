import type { SearchResult } from "../types";

export function searchInContent(
  content: string,
  query: string,
): SearchResult[] {
  if (!query.trim()) return [];

  const lines = content.split("\n");
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    let matchStart = lowerLine.indexOf(lowerQuery);

    while (matchStart !== -1) {
      results.push({
        lineNumber: index + 1,
        lineContent: line,
        matchStart,
        matchEnd: matchStart + query.length,
      });
      matchStart = lowerLine.indexOf(lowerQuery, matchStart + 1);
    }
  });

  return results;
}

export function highlightMatch(result: SearchResult): string {
  const { lineContent, matchStart, matchEnd } = result;
  const before = lineContent.substring(0, matchStart);
  const match = lineContent.substring(matchStart, matchEnd);
  const after = lineContent.substring(matchEnd);

  return `${before}**\`${match}\`**${after}`;
}

export function getContextAroundMatch(
  content: string,
  lineNumber: number,
  contextLines: number = 2,
): string {
  const lines = content.split("\n");
  const startLine = Math.max(0, lineNumber - 1 - contextLines);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  return lines.slice(startLine, endLine).join("\n");
}
