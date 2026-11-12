import { NodeHtmlMarkdown } from "node-html-markdown";
import { parse as parseHtml } from "node-html-parser";

export type Token = {
  /** The piece of the command as explainshell shows it, e.g. `tar(1)` or `f archive.tar.gz`. */
  text: string;
  /** Help text as Markdown. Missing when explainshell could not explain the token. */
  help?: string;
  /** True for the word that names a program. */
  isCommand: boolean;
  /** `shell` for shell syntax, otherwise `command0`, `command1`, ... one per program in the line. */
  group: string;
  /** Where the token sits in the command, as [start, end). Missing if it could not be located. */
  range?: [number, number];
};

export type Explanation = { command: string; tokens: Token[] } | { command: string; error: string; detail: string };

export function explainUrl(command: string): string {
  return `https://explainshell.com/explain?cmd=${encodeURIComponent(command)}`;
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The text with no Markdown markers, for places that cannot render it: the clipboard, and the
 * blockquotes Raycast prints as plain text. Bold and italic markers go before unescaping, so real
 * asterisks and underscores (which arrive escaped) survive; the italic match needs an unescaped
 * pair, or a literal `\_foo\_` would be read as italics.
 */
export function plainHelp(markdown: string): string {
  return markdown
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<![\\\p{L}\p{N}])_([^_\n]*[^_\\\n])_(?![\p{L}\p{N}])/gu, "$1")
    .replace(/\\([!-/:-@[-`{-~])/g, "$1");
}

// Man pages are full of placeholders like <file>. Unescaped, Markdown reads them as HTML tags
// and drops them, so "<" joins the characters the converter escapes by default.
const toMarkdown = new NodeHtmlMarkdown({ globalEscape: [/[\\`*_~[\]<]/gm, "\\$&"] });

const isWordChar = (char: string | undefined) => !!char && /[\p{L}\p{N}]/u.test(char);

/**
 * The site's own Markdown pass leaves some bold unclosed, so its HTML carries literal asterisks,
 * e.g. "**-f **list". This turns them back into bold, but only for shapes that cannot be real
 * asterisks: text starting with a dash, or one to three punctuation characters. Glob text such
 * as "a / ** / b" is left exactly as the site shows it.
 */
// ponytail: narrow on purpose. Widen the pattern only with a saved page that shows a new shape.
export function repairBold(markdown: string): string {
  return markdown.replace(
    /\\\*\\\*(-[^*\n]{0,40}?|[^\p{L}\p{N}\s*\\/]{1,3})(\s*)\\\*\\\*/gu,
    (match: string, text: string, space: string, offset: number) => {
      // Markdown cannot bold punctuation glued to a word ("2**>&**1"); there, drop the markers.
      const gluedBefore = isWordChar(markdown[offset - 1]);
      const gluedAfter = !space && !isWordChar(text.at(-1)) && isWordChar(markdown[offset + match.length]);
      return gluedBefore || gluedAfter ? text + space : `**${text}**${space}`;
    },
  );
}

/** Turn the HTML of an explainshell.com/explain page into tokens and their help text. */
export function parseExplainPage(html: string, command: string): Explanation {
  const root = parseHtml(html);

  // Error pages (missing man page, parsing error) come back as HTTP 200 with a heading.
  const heading = root.querySelector("div.span8 > h4");
  if (heading) {
    const container = heading.parentNode;
    container.querySelectorAll("h4, pre").forEach((el) => el.remove());
    return { command, error: collapse(heading.text), detail: collapse(container.text) };
  }

  // A result page carries the command it explains in its title. The site answers some
  // requests with a stored page for a different command, also as HTTP 200, so check it.
  const expectedTitle = `explainshell.com - ${command.trim().slice(0, 1000)}`; // the site cuts at 1000
  if (collapse(root.querySelector("title")?.text ?? "") !== collapse(expectedTitle)) {
    return {
      command,
      error: "Unexpected response",
      detail: "explainshell.com did not return an explanation for this command.",
    };
  }

  const helpById = new Map<string, string>();
  for (const box of root.querySelectorAll("#help .help-box")) {
    // The site's HTML has a zero-width non-joiner between adjacent bold and italic runs.
    // Left in, it sits between the Markdown markers and they render as literal ** and _.
    const html = box.innerHTML.replaceAll(String.fromCharCode(0x200c), "");
    // Raycast prints a blockquote as plain text, inline Markdown unparsed, so the site's indented
    // examples would show their escapes and markers. Keep the indent, give it plain text.
    const markdown = repairBold(toMarkdown.translate(html)).replace(
      /^((?:> ?)+)(.*)$/gm,
      (_line, quote: string, text: string) => quote + plainHelp(text),
    );
    helpById.set(box.id, markdown);
  }

  // Tokens come in command order and cover everything but whitespace, so each one is the
  // next match after the previous one.
  let cursor = 0;
  const tokens = root
    .querySelectorAll("#command span")
    .filter((span) => /^(command\d+|shell)\b/.test(span.classNames))
    .map((span): Token => {
      const text = span.text.replaceAll("\xa0", " ").trim();
      const isCommand = span.classList.contains("simplecommandstart");
      // The site shows a program as "tar(1)"; in the command it is just "tar".
      const typed = isCommand ? text.replace(/\(\w+\)$/, "") : text;
      const start = command.indexOf(typed, cursor);
      if (start !== -1) cursor = start + typed.length;
      return {
        text,
        help: helpById.get(span.getAttribute("helpref") ?? ""),
        isCommand,
        group: span.classNames.split(" ")[0],
        range: start === -1 ? undefined : [start, cursor],
      };
    });

  return { command, tokens };
}

// ponytail: how many characters of the command the detail pane shows at once. Not documented:
// about 60 fit across the pane in a screenshot at Raycast's default text size, and a cut line
// adds an ellipsis at each end. Lower it if the picture gets too wide.
const PANE_WIDTH = 56;

/** Where the visible window of a long command starts, so that it contains the given token. */
function windowStart(command: string, [start, end]: [number, number]): number {
  // Show the start of the command for as long as the token fits there, then slide along.
  return end <= PANE_WIDTH ? 0 : Math.max(0, Math.min(start - 10, command.length - PANE_WIDTH));
}

// ponytail: sized by eye to match Raycast's own code block (432 x 50 points, 11.5 point Menlo,
// whose characters are 0.602 of the font size wide). Tune here if the picture looks off.
const SVG = { width: 432, height: 50, padding: 16, fontSize: 11.5, charWidth: 11.5 * 0.602 };

const xmlEscape = (s: string) => s.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * The command drawn as an SVG, each token in its own color, with a ^^^ marker under the selected
 * one. A long command is cut to a window around that token. Markdown cannot color text, and
 * Raycast renders SVG pictures in the detail pane, which is why this is a picture.
 * Every token is placed at its own x position, so the marker lines up whatever font is used.
 */
export function commandSvg(command: string, tokens: Token[], selected: Token, colorOf: (t: Token) => string): string {
  if (!selected.range) return "";
  const from = windowStart(command, selected.range);
  const to = from + PANE_WIDTH;
  const text = (index: number, y: number, fill: string, content: string) => {
    const x = SVG.padding + (index - from + (from > 0 ? 1 : 0)) * SVG.charWidth;
    return `<text x="${x.toFixed(1)}" y="${y}" fill="${fill}">${xmlEscape(content)}</text>`;
  };

  const parts = tokens.flatMap((token) => {
    if (!token.range || token.range[0] >= to || token.range[1] <= from) return [];
    const start = Math.max(token.range[0], from);
    return [text(start, 21, colorOf(token), command.slice(start, Math.min(token.range[1], to)))];
  });
  if (from > 0) parts.push(text(from - 1, 21, "#808080", "…"));
  if (to < command.length) parts.push(text(to, 21, "#808080", "…"));
  const [start, end] = selected.range;
  parts.push(text(start, 37, colorOf(selected), "^".repeat(Math.min(end, to) - start)));

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG.width}" height="${SVG.height}" ` +
    `viewBox="0 0 ${SVG.width} ${SVG.height}" font-family="Menlo, monospace" font-size="${SVG.fontSize}" ` +
    `xml:space="preserve"><rect width="${SVG.width}" height="${SVG.height}" rx="8" fill="#808080" ` +
    `fill-opacity="0.15"/>${parts.join("")}</svg>`
  );
}

/** What the detail pane shows for one token: the command as a colored picture, then the help text. */
export function detailMarkdown(command: string, tokens: Token[], token: Token, colorOf: (t: Token) => string): string {
  const svg = commandSvg(command, tokens, token, colorOf);
  const image = svg ? `![](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})\n\n` : "";
  // Help for an option starts with its flags in bold, then a blank line. Show that line as a heading.
  const help = token.help?.replace(/^(\*\*.+)\n\n/, "### $1\n\n");
  return image + (help ?? "No help text found for this part of the command.");
}
