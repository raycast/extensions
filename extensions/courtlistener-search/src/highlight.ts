/**
 * Turning CourtListener's search output into something Raycast can render: text fields arrive as
 * fragments of the page they were extracted from, escaped, and sometimes marked up.
 */

/**
 * With `highlight=on` the API wraps matched terms in <mark> tags, in caseName as well as in the
 * opinion text, so plain fields need stripping before they reach a title or the clipboard. The
 * search here doesn't ask for highlighting, but a cached response from a build that did still can.
 */
export function stripHighlights(text: string): string {
  return text.replace(/<\/?mark>/g, "");
}

/** Named entities CourtListener's highlighter emits. Numeric references are handled separately. */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Snippets arrive HTML-escaped — the highlighter marks up extracted opinion text, so an ampersand
 * in a party's name reaches us as `&amp;`. Decoded after tags are stripped, so an escaped angle
 * bracket in the opinion can't turn into a tag on the way through.
 */
function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, ref: string) => {
    if (!ref.startsWith("#")) {
      return ENTITIES[ref.toLowerCase()] ?? whole;
    }
    const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : Number(ref.slice(1));
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/**
 * Any highlighted field, reflowed into one run of Markdown prose. Every text field CourtListener
 * indexes comes back carrying the line breaks of the page it was extracted from — mid-sentence,
 * and sometimes mid-word — and none of them mean anything once the text is out of its column. A
 * break falling inside a <mark> matters especially: it would split the bold across a paragraph,
 * which Markdown doesn't render as bold at all.
 */
export function toMarkdown(text: string): string {
  return decodeEntities(
    text
      .replace(/\s+/g, " ")
      // Whitespace that sat inside the tags stays outside the delimiters: `** immune**` is not
      // emphasis, and dropping the space instead would run the highlight into the word before it.
      .replace(/<mark>(\s*)(.*?)(\s*)<\/mark>/g, (_all, before: string, text: string, after: string) =>
        text ? `${before}**${text}**${after}` : `${before}${after}`,
      )
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * The snippet is a ~120 character window onto the line of an opinion that matched. It starts and
 * ends wherever the match fell, so the ragged edges are marked.
 *
 * It is what the pane shows when a case has no summary, which is most of them: the syllabus is
 * filed by a handful of state appellate courts and almost never by a federal one.
 */
export function snippetToMarkdown(snippet: string | undefined): string {
  if (!snippet?.trim()) {
    return "_Open the opinion to read the full text._";
  }

  const body = toMarkdown(snippet);

  // Tested against the text without its emphasis, since a snippet can open on a highlighted word.
  const plain = body.replace(/\*\*/g, "");
  const opensMidSentence = /^[a-z,;]/.test(plain);
  const closesCleanly = /[.!?"'’)]$/.test(plain);
  return `${opensMidSentence ? "…" : ""}${body}${closesCleanly ? "" : "…"}`;
}
