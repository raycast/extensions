/**
 * Articles published as Markdown: a `.md` URL opened directly, or the version a page
 * advertises with `<link rel="alternate" type="text/markdown">`.
 *
 * The publisher's Markdown is already the clean article, so it skips the HTML pipeline
 * (pre-clean, Readability, Turndown) entirely. Fed to that pipeline instead, it crashes
 * linkedom, which finds no `<html>` element in it.
 *
 * Everything here scans text in a single pass or with regexes bounded to a line, so a large or
 * hostile file can't stall the worker, and no DOM is built.
 */

const MARKDOWN_TYPES = /^text\/(?:x-)?markdown\b/i;
const MARKDOWN_PATH = /\.(?:md|markdown)$/i;

/**
 * True for a Markdown response: its content type says so, or it's plain text at a `.md` path.
 * A full HTML document is never Markdown, whatever its headers claim: a catch-all route can
 * answer `/essay.md` with the site's HTML shell.
 */
export function isMarkdownResponse(contentType: string | null, url: string, body: string): boolean {
  if (/^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\s+html|html)[\s>]/i.test(body.slice(0, 1024))) return false;
  if (contentType && MARKDOWN_TYPES.test(contentType)) return true;
  if (contentType && !/^text\/plain\b/i.test(contentType)) return false;
  try {
    return MARKDOWN_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** The most of a page read for its `<head>`, when the page never closes it. */
const HEAD_LIMIT = 256 * 1024;

/**
 * The page's `<head>`: everything before `</head>` or `<body>`, both of which HTML lets a page
 * omit, and never more than `HEAD_LIMIT`. Parsing this instead of the page keeps a long
 * article's DOM (tens of MB) out of memory.
 */
export function pageHead(html: string): string {
  return html.slice(0, scanHead(html).end);
}

/**
 * Lowercases ASCII only. `toLowerCase` can change a string's length ("İ" becomes two UTF-16
 * units), which would misalign indexes found in the copy with the original.
 */
export function asciiLower(text: string): string {
  return text.replace(/[A-Z]+/g, (run) => run.toLowerCase());
}

/**
 * The Latin-1 named entities, in code point order from U+00A0: "nbsp" is 160, "yuml" is 255.
 * Names are case-sensitive: "Eacute" is É, "eacute" is é.
 */
const LATIN1_NAMES =
  "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 " +
  "acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml " +
  "Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde " +
  "Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig " +
  "ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide " +
  "oslash ugrave uacute ucirc uuml yacute thorn yuml";

// The named entities common in article text; anything else is left encoded.
const ENTITIES: Record<string, string> = {
  ...Object.fromEntries(LATIN1_NAMES.split(" ").map((name, i) => [name, String.fromCharCode(160 + i)])),
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  trade: "™",
  euro: "€",
};

/** Decodes numeric entities and the named ones in `ENTITIES`. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,7});/gi, (entity, code: string) => {
    const lower = code.toLowerCase();
    // Exact case first ("Eacute"), then any case for the rest ("&AMP;" is still "&").
    if (lower[0] !== "#") return ENTITIES[code] ?? ENTITIES[lower] ?? entity;
    const point = lower[1] === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}

/** The attributes of a tag, read left to right, so text inside a quoted value is never an attribute. */
function attributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const m of tag.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!attrs.has(name)) attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ""));
  }
  return attrs;
}

/**
 * The `<link>` and `<base>` tags in the page's head, and where the head ends: at `</head>`, at
 * `<body>`, or at `HEAD_LIMIT`. Skips comments and the contents of scripts, styles, and other
 * raw-text elements, so a "<body>" in a script string doesn't end the head. One pass: each
 * character is visited once.
 */
function scanHead(html: string): { tags: { name: string; attrs: Map<string, string> }[]; end: number } {
  const head = html.slice(0, HEAD_LIMIT);
  const lower = asciiLower(head);
  const tags: { name: string; attrs: Map<string, string> }[] = [];
  let i = 0;
  while ((i = lower.indexOf("<", i)) !== -1) {
    if (/^<(?:\/head|body)[\s>/]/.test(lower.slice(i, i + 7))) return { tags, end: i };
    if (lower.startsWith("<!--", i)) {
      const end = lower.indexOf("-->", i + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }
    const name = lower.slice(i + 1, i + 12).match(/^([a-z]+)[\s/>]/)?.[1];
    if (!name) {
      i++;
      continue;
    }
    // Find the tag's closing ">", skipping any inside quoted attribute values.
    let end = i + 1 + name.length;
    for (let quote = ""; end < head.length; end++) {
      const c = head[end];
      if (quote) {
        if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (end >= head.length) break;
    if (name === "link" || name === "base")
      tags.push({ name, attrs: attributes(head.slice(i + 1 + name.length, end)) });
    i = end + 1;
    if (["script", "style", "noscript", "template", "title", "textarea"].includes(name)) {
      const close = lower.indexOf(`</${name}`, i);
      if (close === -1) break;
      i = close;
    }
  }
  return { tags, end: head.length };
}

/**
 * The absolute URL of the page's Markdown alternate, or null. Read from the page's `<head>`,
 * honoring `<base href>`.
 */
export function findMarkdownAlternate(html: string, pageUrl: string): string | null {
  const { tags } = scanHead(html);
  const baseHref = tags.find((t) => t.name === "base" && t.attrs.get("href"))?.attrs.get("href");
  const base = baseHref ? absolutize(baseHref, pageUrl) : pageUrl;

  for (const { name, attrs } of tags) {
    const rel = attrs.get("rel")?.toLowerCase().split(/\s+/) ?? [];
    const href = attrs.get("href")?.trim();
    if (name !== "link" || !rel.includes("alternate") || !MARKDOWN_TYPES.test(attrs.get("type") ?? "") || !href) {
      continue;
    }
    try {
      const url = new URL(href, base);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      // Unparseable href: keep looking
    }
  }
  return null;
}

/**
 * Splits Markdown into alternating prose and code (odd indexes are code), so rewrites never
 * touch code. Fences close only on a run of the same character at least as long as the opener,
 * as CommonMark requires; an unclosed fence runs to the end. Indented code blocks aren't
 * detected: a four-space indent is just as often a list's continuation.
 */
function splitFences(markdown: string): string[] {
  const parts: string[] = [];
  let current: string[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const line of markdown.split("\n")) {
    if (fence) {
      current.push(line);
      const close = line.match(/^ {0,3}(`+|~+)[ \t]*\r?$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        parts.push(current.join("\n"));
        current = [];
        fence = null;
      }
      continue;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      parts.push(current.join("\n"));
      current = [line];
      fence = { char: open[1][0], length: open[1].length };
      continue;
    }
    current.push(line);
  }
  parts.push(current.join("\n"));
  // Rejoin with the newlines the split removed, keeping prose/code alternation.
  return parts.map((part, i) => (i < parts.length - 1 ? part + "\n" : part));
}

/** Inline code spans: a run of backticks, closed by a run of the same length, within a line. */
const INLINE_CODE = /(?<!`)(`{1,8})(?!`)[^\n]{0,2000}?(?<!`)\1(?!`)/g;

/**
 * Applies `rewrite` to prose only. Fenced blocks and inline code spans go through `code`, which
 * by default leaves them exactly as written.
 */
function mapProse(
  markdown: string,
  rewrite: (prose: string) => string,
  code: (code: string, fenced: boolean) => string = (c) => c,
): string {
  return splitFences(markdown)
    .map((part, i) => {
      if (i % 2) return code(part, true);
      let out = "";
      let last = 0;
      for (const m of part.matchAll(INLINE_CODE)) {
        out += rewrite(part.slice(last, m.index)) + code(m[0], false);
        last = m.index + m[0].length;
      }
      return out + rewrite(part.slice(last));
    })
    .join("");
}

function absolutize(href: string, baseUrl: string): string {
  // A backslash is a Markdown escape here, which URL would read as a path separator.
  if (href.includes("\\")) return href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

/** `title` from YAML (`---`) or TOML (`+++`) front matter, including a YAML `>` or `|` block. */
function frontMatterTitle(block: string, toml: boolean): string | null {
  const lines = block.split(/\r?\n/);
  const key = toml ? /^title\s*=/ : /^title\s*:/;
  const at = lines.findIndex((line) => key.test(line));
  if (at === -1) return null;
  const value = lines[at].replace(key, "").trim();
  if (toml || !/^[>|][-+]?\d*$/.test(value)) return unquote(value) || null;
  const folded: string[] = [];
  for (const line of lines.slice(at + 1)) {
    if (!/^\s+\S/.test(line)) break;
    folded.push(line.trim());
  }
  return folded.join(" ") || null;
}

/** Front matter title, or a leading `# Heading`, which is removed since Reader shows the title itself. */
function takeTitle(markdown: string): { title: string | null; body: string } {
  let title: string | null = null;
  const frontMatter = markdown.match(/^(---|\+\+\+)[ \t]*\r?\n([\s\S]*?)\r?\n\1[ \t]*(?:\r?\n|$)/);
  if (frontMatter) {
    title = frontMatterTitle(frontMatter[2], frontMatter[1] === "+++");
    markdown = markdown.slice(frontMatter[0].length);
  }
  // A closing run of #s needs a space before it: "# C#" is titled "C#".
  const heading = markdown.match(/^\s*(?:#[ \t]+([^\n]+?)(?:[ \t]+#+)?|([^\n]+)\r?\n=+)[ \t]*\r?(?:\n|$)/);
  if (heading) {
    title ??= (heading[1] ?? heading[2]).trim();
    markdown = markdown.slice(heading[0].length);
  }
  return { title, body: markdown.trim() };
}

/** Removes `<tag>…</tag>` blocks, one pass; an unclosed one runs to the end. */
function dropElements(text: string, name: string): string {
  const lower = asciiLower(text);
  let out = "";
  let i = 0;
  let open: number;
  while ((open = lower.indexOf(`<${name}`, i)) !== -1) {
    out += text.slice(i, open);
    const close = lower.indexOf(`</${name}`, open);
    if (close === -1) return out;
    i = lower.indexOf(">", close) + 1 || text.length;
  }
  return out + text.slice(i);
}

/** Plain text for the summarizer: no Markdown syntax, links, or HTML tags. Code keeps its text. */
function toPlainText(markdown: string): string {
  const prose = (text: string) =>
    decodeEntities(
      dropElements(dropElements(text, "script"), "style")
        .replace(/^ {0,3}\[[^\]\n]{1,300}\]:[^\n]*$/gm, "")
        .replace(/!\[[^\]\n]{0,1000}\]\([^)\n]*\)/g, "")
        .replace(/\[([^\]\n]{0,1000})\]\([^)\n]*\)/g, "$1")
        .replace(/<\/?[a-z][a-z0-9-]*(?:\s[^<>\n]{0,1000})?\/?>/gi, "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s*>\s?/gm, "")
        .replace(/\*+|__+|`+/g, ""),
    );
  // Code keeps its text, minus fence lines and backticks; HTML-looking code ("`<script>`") is text, not markup.
  return mapProse(markdown, prose, (code, fenced) =>
    fenced ? code.replace(/^ {0,3}(?:`{3,}|~{3,}).*$/gm, "") : code.replace(/^`+|`+$/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface MarkdownArticle {
  /** From front matter or a leading heading; null when the file names none. */
  title: string | null;
  /** The article body, ready for Raycast's Detail view. */
  body: string;
  textContent: string;
}

/** Normalized as CommonMark matches reference labels: case-insensitive, whitespace collapsed. */
function label(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Prepares a Markdown article for display. `url` is the Markdown's own URL, which its relative
 * links resolve against.
 */
export function parseMarkdownArticle(markdown: string, url: string): MarkdownArticle {
  const { title, body: raw } = takeTitle(markdown.replace(/^\uFEFF/, ""));
  const references = new Set([...raw.matchAll(/^ {0,3}\[([^\]\n]{1,300})\]:/gm)].map((m) => label(m[1])));

  const body = mapProse(raw, (prose) => {
    prose = prose
      // Relative links, images, reference definitions, and HTML attributes resolve against the Markdown's URL.
      .replace(/(\]\(<?)([^)\s>]+)/g, (_m, open, href) => open + absolutize(href, url))
      .replace(/^( {0,3}\[[^\]\n]{1,300}\]:[ \t]*<?)([^\s>]+)/gm, (_m, open, href) => open + absolutize(href, url))
      .replace(
        /(\s(?:src|href)\s*=\s*)(["'])([^"'\s]{1,2000})\2/gi,
        (_m, attr, quote, href) => attr + quote + absolutize(href, url) + quote,
      )
      // As for HTML articles (see htmlToMarkdown), drop image alt text.
      .replace(/!\[[^\]\n]{0,1000}\]\(/g, "![](");

    // Also as for HTML articles: a bracketed aside like "[Figure: …]" becomes "(Figure: …)" so
    // Raycast doesn't render it as math. Brackets that are Markdown keep them: links and nested
    // link labels, reference links and definitions, task-list boxes, and anything inside a
    // link's destination, and brackets the author escaped (`\[`).
    // Matches arrive in order, so one pointer walks the destinations.
    const destinations = [...prose.matchAll(/\]\([^)\n]*\)/g)].map((m) => [m.index, m.index + m[0].length]);
    let next = 0;
    return prose.replace(/(?<![\]!\\])\[(?![ xX]\])([^\]\n]{1,300})\](?![([:\]])/g, (match, text, offset: number) => {
      while (next < destinations.length && destinations[next][1] <= offset) next++;
      if (next < destinations.length && destinations[next][0] < offset) return match;
      if (references.has(label(text))) return match;
      return `(${text})`;
    });
  });

  return { title, body, textContent: toPlainText(body) };
}
