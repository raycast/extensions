import type { Hit } from "./retrieve";

/**
 * Indexed mail, chat and web text is written by other people, so it is never handed to Raycast as Markdown: an image
 * (`![](https://their-server/id)`) or raw HTML in it would make Raycast fetch that address while the result is merely
 * previewed, which tells the sender the item was seen. Every ASCII punctuation character is backslash-escaped, which
 * CommonMark guarantees renders as the literal character, so no link, image, reference definition, autolink, HTML tag
 * or entity can be formed out of the text.
 */

const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/gu;
// C0 and C1 controls other than tab and newline; they carry no meaning in a preview.
// eslint-disable-next-line no-control-regex
const CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;

/** `text` as Markdown that shows exactly those characters; line breaks are kept as hard breaks. */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\r\n?|\u2028|\u2029/gu, "\n")
    .replace(CONTROLS, "")
    .replace(ASCII_PUNCTUATION, "\\$&")
    .split("\n")
    .map((line) => line.trim())
    .join("  \n");
}

/** `text` on one line, for a heading or a caption. */
const oneLine = (text: string): string => escapeMarkdown(text.replace(/\s+/gu, " ").trim());

export function detailMarkdown(hit: Hit): string {
  const heading =
    hit.location === undefined
      ? `### ${oneLine(hit.title)}`
      : `### ${oneLine(hit.title)}\n\n_${oneLine(hit.location)}_`;
  const body = hit.content.trim().length === 0 ? "_No preview_" : escapeMarkdown(hit.content.trim());
  return `${heading}\n\n${body}`;
}
