import { LyricHighlightRange } from "./types";

export const boldLyricSnippet = (snippet: string, ranges: LyricHighlightRange[]) => {
  let boldedSnippet = snippet;
  let offset = 0;
  ranges.forEach((range) => {
    const start = range.start + offset;
    const end = range.end + offset;
    boldedSnippet =
      boldedSnippet.slice(0, start) + "**" + boldedSnippet.slice(start, end) + "**" + boldedSnippet.slice(end);
    offset += 4;
  });
  return boldedSnippet;
};
