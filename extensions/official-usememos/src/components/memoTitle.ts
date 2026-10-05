const MAX_TITLE_LENGTH = 80;
const LEADING_MARKERS = /^(#{1,6}\s+|>\s*|[-*+]\s+(\[[ xX]\]\s+)?|\d+\.\s+)/;

export const memoTitle = (content: string) => {
  const line = content
    .split("\n")
    .find((candidate) => candidate.trim() !== "")
    ?.trim()
    .replace(LEADING_MARKERS, "");
  if (line == null || line === "") return "Untitled memo";
  return line.length > MAX_TITLE_LENGTH ? `${line.slice(0, MAX_TITLE_LENGTH - 1)}…` : line;
};
