/**
 * De-list: remove ONLY list scaffolding — bullet, numbered, and checkbox markers
 * — while leaving every other formatting marker intact (**bold**, *italic*,
 * [links](url), headings, paragraph breaks).
 *
 * This is the gap the OS "paste without formatting" can't fill: that option
 * strips bold/links but leaves literal "[ ]" / "•" / "- " junk behind (e.g. when
 * pasting Notion to-dos). Magic Eraser does the inverse — it kills the list junk
 * and KEEPS the rich formatting and spacing.
 */
export function delist(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      let l = line;
      // Bullet or numbered list marker at line start (keep the content after it).
      l = l.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "");
      // Raw bullet glyphs (•, ●, ▪, …) that came through as literal text.
      l = l.replace(/^\s*[•●▪◦‣·]\s+/, "");
      // A checkbox marker left at the start, e.g. "[ ] task" or "[x] done".
      l = l.replace(/^\s*\[[ xX]\]\s+/, "");
      return l;
    })
    .join("\n");
}
