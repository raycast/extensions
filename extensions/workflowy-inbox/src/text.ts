const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// Workflowy returns node names and notes as rich text, e.g.
// `<span class="colored c-blue">Item</span>` or `<b>bold</b>`, with `&`, `<`
// and `>` escaped. Drop the tags and decode the entities to show plain text.
export function toPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}
