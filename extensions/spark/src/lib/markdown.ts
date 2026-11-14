// Email bodies, subjects, and sender names are attacker-controlled. Raycast
// renders Detail markdown and fetches any image it references, so an
// `![](https://tracker/pixel)` in a body would phone home the moment the user
// selects the email. Untrusted text is rebuilt token by token:
//
// - Plain text is escaped with numeric HTML entities, not backslashes:
//   Raycast renders `\( … \)`, `\[ … \]`, and `$ … $` as LaTeX.
// - `[label](url)` - how Spark writes an HTML link as text - becomes a real
//   link for http(s) and mailto only.
// - `![alt](url)` keeps only its alt text; the image never loads.
// - `**` bold markers are dropped (see `untrusted`).
// - Bare URLs become `<…>` autolinks, which markdown takes verbatim.

const MARKDOWN_SPECIALS = /[&\\`*_{}[\]()#+!|<>~=$-]/g;

// A link destination: http(s) or mailto, allowing one level of balanced
// parentheses (`https://x.io/a_(b)`).
const DESTINATION = String.raw`(?:https?:\/\/|mailto:)(?:[^\s()<>]|\([^\s()<>]*\))+`;
const TOKEN = new RegExp(
  String.raw`(!?)\[([^\[\]\n]{0,500})\]\((${DESTINATION})\)` + // 1-3: image or link
    String.raw`|\bhttps?:\/\/[^\s<>"'\x60]+`, // 0: bare URL
  "gi",
);

function entity(char: string): string {
  return `&#${char.charCodeAt(0)};`;
}

function escapeText(text: string): string {
  return text.replace(MARKDOWN_SPECIALS, entity);
}

/// Backslashes and dollars could still open LaTeX, and `<`/`>` would end an
/// `<…>` destination, so those are percent-encoded - the link points to the
/// same place.
function safeURL(url: string): string {
  return url.replace(/[\\$<>]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function link(label: string, url: string): string {
  const text = label.replace(/\s+/g, " ").trim();
  return text ? `[${escapeText(text)}](<${safeURL(url)}>)` : `<${safeURL(url)}>`;
}

/// Splits a trailing ")" that closes surrounding text (`(see https://x.io)`)
/// or sentence punctuation off a bare URL.
function trimURL(url: string): [string, string] {
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    const head = url.slice(0, end);
    if (".,;:!?'\"".includes(last)) end--;
    else if (last === ")" && count(head, "(") < count(head, ")")) end--;
    else if (last === "]" && count(head, "[") < count(head, "]")) end--;
    else break;
  }
  return [url.slice(0, end), url.slice(end)];
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

function escapeLine(line: string): string {
  let result = "";
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    result += escapeText(line.slice(last, start));
    last = start + match[0].length;
    const [whole, bang, label, destination] = match;
    if (destination !== undefined) {
      result += bang ? escapeText(label.trim()) : link(label, destination);
      continue;
    }
    const [url, rest] = trimURL(whole);
    result += (url.length > "https://".length ? `<${safeURL(url)}>` : escapeText(url)) + escapeText(rest);
  }
  return result + escapeText(line.slice(last));
}

/// Escapes untrusted text for inline use (paragraphs, table cells).
export function inline(text: string): string {
  return escapeLine(text.replace(/\s+/g, " ").trim());
}

/// Characters that can still add formatting, a link, or an image inside a
/// heading. `]` is left alone: escaping both brackets would make `\[ … \]`,
/// which Raycast renders as LaTeX, and an escaped `[` already stops a link.
const HEADING_SPECIALS = /[\\`*_~<>!#|$[]/g;

/// Escapes untrusted text for a markdown heading (`# …`). Raycast doesn't
/// decode HTML entities in headings - `&#45;` shows as is - so a heading uses
/// backslash escapes, and only where needed: a line that starts with `#`
/// gives other punctuation no meaning.
export function heading(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(HEADING_SPECIALS, (char) => `\\${char}`);
}

/// Escapes a multi-line untrusted body, keeping its line breaks.
export function untrusted(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      // Spark marks bold as `**…**` in the text form, but not reliably
      // ("Name** mentioned you** on…"), so the markers are dropped rather
      // than shown or guessed at.
      const text = line.replace(/\*{2,}/g, "").replace(/^\s+/, "");
      // An HTML heading comes through as "### Title"; it's shown bold.
      const heading = text.match(/^#{1,6}\s+(\S.*)$/);
      if (heading) return `**${escapeLine(heading[1].trim())}**`;
      // Leading spaces would turn the line into a code block, and "1. item"
      // into an ordered list.
      return escapeLine(text).replace(/^(\d+)\./, "$1&#46;");
    })
    .join("  \n")
    .replace(/( {2}\n){3,}/g, "  \n  \n");
}
