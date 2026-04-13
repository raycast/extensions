/**
 * Clean up text copied from a Claude Code terminal session.
 *
 * - Strips the leading ❯ prompt
 * - Groups non-blank lines into paragraphs
 * - Joins wrapped lines within each paragraph
 * - Collapses excess whitespace
 */
export function cleanup(text: string): string {
  // Remove leading ❯ prompt (with optional space after it)
  text = text.replace(/^❯\s*/gm, "");

  const lines = text.split("\n");

  // Group lines into paragraphs separated by blank lines
  const paragraphs: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length) {
        paragraphs.push(current);
        current = [];
      }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length) {
    paragraphs.push(current);
  }

  // Join lines within each paragraph, collapse whitespace runs
  return paragraphs.map((p) => p.join(" ").replace(/\s{2,}/g, " ")).join("\n\n");
}
