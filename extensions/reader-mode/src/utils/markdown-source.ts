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

/** YAML (`---`) or TOML (`+++`) front matter at the very start; group 2 is its body. */
const FRONT_MATTER = /^(---|\+\+\+)[ \t]*\r?\n([\s\S]*?)\r?\n\1[ \t]*(?:\r?\n|$)/;

/**
 * True for a Markdown response: its content type says so, or it's plain text at a `.md` path.
 * A full HTML document is never Markdown, whatever its headers claim: a catch-all route can
 * answer `/essay.md` with the site's HTML shell.
 */
export function isMarkdownResponse(contentType: string | null, url: string, body: string): boolean {
  if (/^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\s+html|html)[\s>]/i.test(body.slice(0, 1024))) return false;
  if (contentType && MARKDOWN_TYPES.test(contentType)) return true;
  if (contentType && !/^text\/plain\b/i.test(contentType)) return false;
  return isMarkdownPath(url);
}

export function isMarkdownPath(url: string): boolean {
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
 * A fence's opening line: three or more backticks or tildes, and a backtick fence's info has
 * none. A line may end in "\r", as in a file written on Windows.
 */
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?$/;
const FENCE_CLOSE = /^ {0,3}(`+|~+)[ \t]*\r?$/;

function opensFence(line: string): { char: string; length: number } | null {
  const open = line.match(FENCE_OPEN);
  if (!open || (open[1][0] === "`" && open[2].includes("`"))) return null;
  return { char: open[1][0], length: open[1].length };
}

function closesFence(line: string, fence: { char: string; length: number }): boolean {
  const close = line.match(FENCE_CLOSE);
  return !!close && close[1][0] === fence.char && close[1].length >= fence.length;
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
      if (closesFence(line, fence)) {
        parts.push(current.join("\n"));
        current = [];
        fence = null;
      }
      continue;
    }
    const open = opensFence(line);
    if (open) {
      parts.push(current.join("\n"));
      current = [line];
      fence = open;
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

/** For each line inside a fenced code block, the block's first and last lines. */
function codeBlocks(lines: string[]): ({ start: number; end: number } | undefined)[] {
  const blocks: ({ start: number; end: number } | undefined)[] = new Array(lines.length);
  let fence: { char: string; length: number } | null = null;
  let opened = 0;
  for (let i = 0; i < lines.length; i++) {
    if (fence) {
      if (closesFence(lines[i], fence)) {
        for (let j = opened; j <= i; j++) blocks[j] = { start: opened, end: i };
        fence = null;
      }
    } else if ((fence = opensFence(lines[i]))) {
      opened = i;
    }
  }
  if (fence) for (let j = opened; j < lines.length; j++) blocks[j] = { start: opened, end: lines.length - 1 };
  return blocks;
}

/** A one-line JSON body naming schema.org: the page's JSON-LD, which a converter keeps as code. */
const JSON_LD = /^[ \t]*\{.*"@context"\s*:\s*"https?:\/\/schema\.org/;
const SKIP_LINK = /^\[skip to [^\]\n]{1,60}\]\(#[^)\s]*\)$/i;
const THEME_TOGGLE = /^(?:light|dark|system|auto)(?:\s*(?:light|dark|system|auto)){1,3}$/i;
/** A docs page's feedback widget, its question and its buttons: "Was this helpful?" over "YesNo". */
const FEEDBACK_WIDGET = /^(?:(?:was this (?:page |article )?helpful|did this (?:page )?help)\??|yes\s*no)$/i;
/** A line that is one link, its label text or an image plus text: the link's URL is captured. */
const LINK_LINE = /^\[(?:!\[[^\]\n]{0,300}\]\([^)\s]{0,2000}\))?[^[\]\n]{0,100}\]\(([^)\s]{1,2000})\)$/;

/**
 * Removes what a converter carries over from the page around the article when it turns a whole
 * HTML page into Markdown, as Cloudflare does for `Accept: text/markdown`. Only the start and the
 * end of the document are touched, where the page's header and footer land; a line that looks
 * like chrome inside the article stays. At the start: a skip link, links to the site's home page
 * (its logo and name), and a quoted note pointing agents at `llms.txt`. At the end: those, a
 * light/dark theme toggle, a feedback widget ("Was this helpful?" over "YesNo"), the page's
 * JSON-LD, and headings left with nothing under them ("On this page" over a table of contents the
 * converter dropped). Front matter is kept. `url` is the page's
 * URL, which says what its home page is. `pageHtml` is the page's HTML: a closing JSON-LD block is
 * the page's own only when that HTML carries the same JSON, and is otherwise an example the
 * article ends with.
 */
export function stripPageChrome(markdown: string, url: string, pageHtml = ""): string {
  let home: string | null = null;
  try {
    home = new URL("/", url).href;
  } catch {
    // No home page to recognize
  }
  const isChromeLine = (line: string) => {
    const text = line.trim();
    if (SKIP_LINK.test(text) || THEME_TOGGLE.test(text)) return true;
    const link = text.match(LINK_LINE);
    if (!link || !home) return false;
    try {
      return new URL(link[1], url).href === home;
    } catch {
      return false;
    }
  };

  const frontMatter = markdown.match(FRONT_MATTER)?.[0] ?? "";
  const lines = markdown.slice(frontMatter.length).split("\n");
  const blocks = codeBlocks(lines);
  const isQuote = (i: number) => !blocks[i] && /^ {0,3}>/.test(lines[i]);
  const quoteNamesLlms = (from: number, to: number) => lines.slice(from, to).some((l) => /\bllms\.txt\b/i.test(l));

  let first = 0;
  while (first < lines.length) {
    if (blocks[first]) break;
    if (!lines[first].trim() || isChromeLine(lines[first])) {
      first++;
    } else if (isQuote(first)) {
      let end = first;
      while (end < lines.length && isQuote(end)) end++;
      if (!quoteNamesLlms(first, end)) break;
      first = end;
    } else break;
  }

  let last = lines.length;
  while (last > first) {
    const i = last - 1;
    const block = blocks[i];
    if (block) {
      const json = lines[block.start + 1]?.trim() ?? "";
      const isJsonLd =
        block.end === i && i - block.start === 2 && JSON_LD.test(json) && !!pageHtml && pageHtml.includes(json);
      if (!isJsonLd || block.start < first) break;
      last = block.start;
    } else if (
      !lines[i].trim() ||
      isChromeLine(lines[i]) ||
      FEEDBACK_WIDGET.test(lines[i].trim()) ||
      /^ {0,3}#{1,6}(?:\s|$)/.test(lines[i])
    ) {
      last = i;
    } else if (isQuote(i)) {
      let start = i;
      while (start > first && isQuote(start - 1)) start--;
      if (!quoteNamesLlms(start, last)) break;
      last = start;
    } else break;
  }

  if (first === 0 && last === lines.length) return markdown;
  return frontMatter + lines.slice(first, last).join("\n") + (last < lines.length ? "\n" : "");
}

/**
 * A JSX component's tag in prose: a closing tag (`</Note>`), an opening tag with attributes, even
 * spread over lines (`<Card title="…">`), a self-closing one (`<Badge />`), or a bare opening tag
 * alone on its line (`<Steps>`). A capitalized type in prose, as in `List<String>`, is none of these.
 */
const COMPONENT_TAG =
  /<\/[A-Z][\w.]{0,60}\s*>|<[A-Z][\w.]{0,60}(?:\s+[\w:-]{1,60}(?:=|\s|\/?>)|\s*\/>)|^[ \t]*<[A-Z][\w.]{0,60}>[ \t]*\r?$/gm;

/**
 * How many JSX component tags the prose holds (`<Steps>`, `<Card title="…">`, `</Note>`): the MDX
 * that documentation sites publish as Markdown. Raycast renders none of them, and the text
 * indented inside them reads as code. Inline code and code blocks don't count.
 */
export function componentTags(markdown: string): number {
  let count = 0;
  mapProse(markdown, (prose) => {
    // A closing tag counts for its opening one too, which can be a bare `<Note>` mid-line.
    for (const [tag] of prose.matchAll(COMPONENT_TAG)) count += tag.startsWith("</") ? 2 : 1;
    return prose;
  });
  return count;
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
  const frontMatter = markdown.match(FRONT_MATTER);
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

/**
 * Plain text for the summarizer: no Markdown syntax, links, or HTML tags. Code keeps its text,
 * unless `withCode` is false.
 */
function toPlainText(markdown: string, withCode = true): string {
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
  return mapProse(markdown, prose, (code, fenced) => {
    if (!withCode) return fenced ? "\n" : "";
    return fenced ? code.replace(/^ {0,3}(?:`{3,}|~{3,}).*$/gm, "") : code.replace(/^`+|`+$/g, "");
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The Markdown's prose as plain text, without its code: what it says, as opposed to what it
 * shows. A code example quoting "Unlimited access" is not the page withholding its story.
 */
export function proseText(markdown: string): string {
  return toPlainText(markdown, false);
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
        /^( {0,3}\[[^\]\n]{1,300}\]:[ \t]*\r?\n[ \t]+<?)([^\s>]+)/gm,
        (_m, open, href) => open + absolutize(href, url),
      )
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

/**
 * Text reduced to lowercase letters and digits, without Markdown links' URLs or reference labels
 * or HTML tags, so the same sentence compares equal in a page's Markdown and in the article
 * Readability took from its HTML, which format it differently.
 */
function comparable(text: string): string {
  return text
    .replace(/!?\[([^\]\n]{0,1000})\](?:\([^)\n]{0,2000}\)|\[[^\]\n]{0,300}\])/g, "$1")
    .replace(/<[^<>\n]{0,1000}>/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * When Readability's article holds at least this share of the Markdown's text, it found the whole
 * article, and what the Markdown has beyond it is the page around it. On seven real pages
 * (2026-10-26), pages whose Markdown added only chrome scored 0.85 to 0.96; pages where it added
 * sections Readability missed scored 0.11 to 0.51.
 */
const ARTICLE_SHARE = 0.75;

/** A line counts as the article's when this much of its start is found there. Shorter lines match by chance. */
const MIN_ANCHOR = 30;
const ANCHOR = 60;

/**
 * A cut-off region holding a line with at least this many letters of prose (outside links and
 * code) is article the HTML parse left out, not page chrome, so that end isn't cut. On real pages
 * (2026-10-26) no line of cut chrome held more than 48 letters; the callout paragraphs Readability
 * dropped from a Cloudflare docs page held 133 and 135. Counted per line: summing a paragraph's
 * lines also sums a footer's rows of short links, and a hand-wrapped paragraph is rare in the
 * Markdown converters produce.
 */
const MIN_PROSE = 100;

/** Lines tried from each end for the article's first and last. Past this, nothing is cut. */
const MAX_PROBES = 300;

/** A reference definition, `[label]: url`, which links earlier in the article depend on. */
const REFERENCE_DEFINITION = /^ {0,3}\[[^\]\n]{1,300}\]:/;

/**
 * Cuts a converted page's Markdown down to the article Readability found in the same page's HTML.
 * A converter keeps the page's header, subscribe form, and menus; Readability drops them, and so
 * marks where the article starts and ends.
 *
 * The cut runs from the first line that is clearly in `articleText` (one whose first `ANCHOR`
 * characters are found there) to the last, then outward through neighboring lines found there in
 * full, however short, such as a closing list of requirements; lines with no text of their own
 * (a rule) come along when such a line lies beyond them. Code blocks are kept whole, an image
 * comes along when `articleHtml` (the article Readability found, as HTML) shows the same file,
 * and reference definitions cut off with the page around the article are kept too.
 *
 * Returns the Markdown unchanged when Readability found only part of the page, or no line of the
 * article can be found.
 */
export function trimToArticle(markdown: string, articleText: string, articleHtml = ""): string {
  const article = comparable(articleText);
  if (article.length < comparable(markdown).length * ARTICLE_SHARE) return markdown;

  // Front matter carries the title, and is kept.
  const frontMatter = markdown.match(FRONT_MATTER)?.[0] ?? "";
  const lines = markdown.slice(frontMatter.length).split("\n");
  const blocks = codeBlocks(lines);
  const anchors = (i: number) => {
    const text = comparable(lines[i]);
    return text.length >= MIN_ANCHOR && article.includes(text.slice(0, ANCHOR));
  };

  // Images by file name, so a reference image (`![Flow][flow]`, `![flow]`) finds its definition's URL.
  const definitions = new Map<string, string>();
  for (const [, name, href] of markdown.matchAll(/^ {0,3}\[([^\]\n]{1,300})\]:[ \t]*\r?\n?[ \t]*<?([^\s>]+)/gm)) {
    definitions.set(label(name), href);
  }
  const fileOf = (href: string | undefined) => href?.split(/[?#]/)[0].split("/").pop() || null;
  /** For a line that is only images: whether the article shows them all. Null for any other line. */
  const imagesShown = (line: string): boolean | null => {
    const images = [
      ...line.matchAll(/!\[([^\]\n]{0,1000})\](?:\(<?([^)\s>]{1,2000})[^)\n]*\)|\[([^\]\n]{0,300})\])?/g),
    ];
    if (!images.length || line.replace(/!\[[^\]\n]{0,1000}\](?:\([^)\n]*\)|\[[^\]\n]{0,300}\])?/g, "").trim())
      return null;
    return images.every(([, alt, inline, ref]) => {
      const file = fileOf(inline ?? definitions.get(label(ref || alt)));
      return !!file && articleHtml.includes(file);
    });
  };

  let first = -1;
  for (let i = 0; i < Math.min(lines.length, MAX_PROBES); i++) {
    if (anchors(i)) {
      first = blocks[i]?.start ?? i;
      break;
    }
  }
  let last = -1;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - MAX_PROBES); i--) {
    if (anchors(i)) {
      last = blocks[i]?.end ?? i;
      break;
    }
  }
  if (first === -1 || last < first) return markdown;

  // Outward through lines found in the article, skipping over lines with no text of their own.
  const extend = (from: number, step: 1 | -1) => {
    let edge = from;
    for (let i = from + step; i >= 0 && i < lines.length; i += step) {
      const block = blocks[i];
      if (block) {
        // The code between the fences; a fence's info string ("sh") isn't in the article.
        const closed = block.end > block.start && FENCE_CLOSE.test(lines[block.end]);
        const code = lines.slice(block.start + 1, closed ? block.end : block.end + 1).join("\n");
        if (!article.includes(comparable(code))) break;
        edge = step > 0 ? block.end : block.start;
        i = edge;
        continue;
      }
      const shown = imagesShown(lines[i]);
      if (shown !== null) {
        if (shown) edge = i;
        continue;
      }
      const text = comparable(lines[i]);
      if (!text) continue;
      if (!article.includes(text)) break;
      edge = i;
    }
    return edge;
  };
  first = extend(first, -1);
  last = extend(last, 1);

  // An end whose cut-off region holds prose is article the HTML parse missed: keep it whole.
  const prose = (line: string) =>
    line
      .replace(/!?\[[^\]\n]{0,1000}\](?:\([^)\n]*\)|\[[^\]\n]{0,300}\])/g, "")
      .replace(/<[^<>\n]{0,1000}>/g, "")
      .replace(/[^\p{L}]+/gu, "").length;
  const holdsProse = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (!blocks[i] && prose(lines[i]) >= MIN_PROSE) return true;
    return false;
  };
  if (holdsProse(0, first)) first = 0;
  if (holdsProse(last + 1, lines.length)) last = lines.length - 1;
  if (first === 0 && last === lines.length - 1) return markdown;

  // A definition's destination or title may continue on the indented lines after it.
  const references: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if ((i >= first && i <= last) || blocks[i] || !REFERENCE_DEFINITION.test(lines[i])) continue;
    references.push(lines[i]);
    while (i + 1 < lines.length && /^[ \t]+\S/.test(lines[i + 1]) && !REFERENCE_DEFINITION.test(lines[i + 1])) {
      references.push(lines[++i]);
    }
  }
  return frontMatter + [...lines.slice(first, last + 1), ...(references.length ? ["", ...references] : [])].join("\n");
}
