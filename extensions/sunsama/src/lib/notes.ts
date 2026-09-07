/**
 * Convert Sunsama's task-notes HTML (a TipTap document) to Markdown so notes
 * can be edited in a plain text area and written back via edit_task_notes
 * (which accepts Markdown). Covers what the Sunsama editor emits: paragraphs,
 * headings, bold/italic/code, links, bullet/ordered lists, and checkbox
 * ("taskItem") lists. Unknown tags are stripped, entities decoded.
 */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Strip any remaining tags from an inline fragment. */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

export function htmlToMarkdown(html: string | undefined | null): string {
  if (!html) return "";
  let s = html;

  // Inline marks first, while their tags are still present.
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**");
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*");
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`");
  s = s.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, text) => `[${stripTags(text).trim()}](${href})`,
  );

  // Checkbox task items (before generic list items).
  s = s.replace(
    /<li[^>]*data-type="taskItem"[^>]*>([\s\S]*?)<\/li>/gi,
    (_m, inner: string) => {
      const checked = /<input[^>]*\bchecked\b/i.test(inner);
      return `- [${checked ? "x" : " "}] ${stripTags(inner).trim()}\n`;
    },
  );

  // Ordered list items become "1." (Markdown renumbers), bullets become "-".
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) =>
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m2, li: string) => {
      return `1. ${stripTags(li).trim()}\n`;
    }),
  );
  s = s.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_m, li: string) => `- ${stripTags(li).trim()}\n`,
  );

  // Block elements.
  s = s.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_m, level: string, text: string) =>
      `${"#".repeat(Number(level))} ${stripTags(text).trim()}\n\n`,
  );
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_m, text: string) => `${text}\n\n`,
  );

  // Drop whatever tags remain (ul wrappers, spans, labels, inputs, divs, …).
  s = stripTags(s);
  s = decodeEntities(s);

  // Tidy whitespace: no trailing spaces, max one blank line, trimmed ends.
  return s
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
