import { parseHTML } from "linkedom";

// Article HTML (what Mozilla Readability returns) as Markdown: headings,
// paragraphs, emphasis, links, images, lists, quotes, code and tables. Small
// on purpose — an article needs a dozen elements, not a full HTML renderer —
// and pure, so it can be tested without Raycast.

type Node = { nodeType: number; textContent: string | null; childNodes: ArrayLike<Node> };
type Element = Node & {
  localName: string;
  children: ArrayLike<Element>;
  getAttribute(name: string): string | null;
  querySelector(selector: string): Element | null;
  querySelectorAll(selector: string): ArrayLike<Element>;
};

const ELEMENT = 1;
const TEXT = 3;

/** Elements that start a new block; everything else flows inside a paragraph. */
const BLOCK = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "ul",
]);

/** Elements whose content is never part of the text. */
const SKIPPED = new Set(["script", "style", "template", "svg", "button", "form", "input", "select", "textarea"]);

/** Stands for a `<br>` until whitespace has been collapsed around it. */
const BREAK = "\u0000";

/**
 * Stand-ins (private-use characters) that keep code's own whitespace out of
 * the prose clean-up — collapsing spaces, squeezing blank lines — and are put
 * back at the end: a space and a tab inside inline code, and an empty line
 * inside a code block.
 */
const CODE_SPACE = "\ue000";
const CODE_TAB = "\ue001";
const CODE_BLANK_LINE = "\ue002";
const STAND_INS = /[\ue000-\ue002]/g;

/** Code's spaces and tabs as stand-ins; any stand-in already in the page's text is dropped. */
const guardCode = (text: string) => text.replace(STAND_INS, "").replace(/ /g, CODE_SPACE).replace(/\t/g, CODE_TAB);

const isElement = (node: Node): node is Element => node.nodeType === ELEMENT;

/** Backslash the characters Markdown would read as formatting. */
function escapeText(text: string): string {
  return text.replace(STAND_INS, "").replace(/[\\`*_[\]<]/g, "\\$&");
}

/** A paragraph that would start like a heading, a quote or a list item gets that start escaped. */
function escapeLineStart(line: string): string {
  const ordered = /^(\d+)[.)]\s/.exec(line);
  if (ordered) return `${ordered[1]}\\${line.slice(ordered[1].length)}`;
  return /^(#{1,6}\s|>|[-+]\s)/.test(line) ? `\\${line}` : line;
}

/** An absolute http(s) or mailto address safe inside Markdown's `(...)`, or undefined. */
function resolveUrl(raw: string | null, base: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return undefined;
    return url.href.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20");
  } catch {
    return undefined;
  }
}

/** Wrap `inner` in an emphasis marker, keeping its outer spaces outside (`**bold **` isn't bold). */
function wrap(inner: string, marker: string): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
  if (!match || !match[2]) return inner;
  return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
}

/**
 * Inline code, with a fence longer than any backtick run inside it. Its spaces
 * stay as they are (`"a  b"` is a different value from `"a b"`); only line
 * breaks become spaces, as Markdown reads them in a code span anyway.
 */
function codeSpan(text: string): string {
  const value = text.replace(/\r\n?|\n/g, " ");
  if (!value.trim()) return "";
  const longest = Math.max(0, ...(value.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  const pad = value.startsWith("`") || value.endsWith("`") ? " " : "";
  return `${fence}${guardCode(`${pad}${value}${pad}`)}${fence}`;
}

/** The image's address: `src`, a lazy-loading attribute, or the first `srcset` entry. Inline `data:` images are left out. */
function imageSource(el: Element, base: string | undefined): string | undefined {
  const srcset = el.getAttribute("srcset") ?? el.getAttribute("data-srcset");
  const candidates = [
    el.getAttribute("src"),
    el.getAttribute("data-src"),
    el.getAttribute("data-original"),
    srcset?.split(",")[0]?.trim().split(/\s+/)[0] ?? null,
  ];
  for (const candidate of candidates) {
    if (!candidate || /^data:/i.test(candidate.trim())) continue;
    const url = resolveUrl(candidate, base);
    if (url && !url.startsWith("mailto:")) return url;
  }
  return undefined;
}

/**
 * Set while `htmlToMarkdown` runs (it is synchronous): what an image's address
 * is written as. For saving a page's images next to it, where the Markdown
 * points at the saved copies.
 */
let writeImage: ((url: string) => string) | undefined;

function image(el: Element, base: string | undefined): string {
  const src = imageSource(el, base);
  if (!src) return "";
  const alt = escapeText((el.getAttribute("alt") ?? "").replace(/\s+/g, " ").trim());
  return `![${alt}](${writeImage ? writeImage(src) : src})`;
}

/** Inline Markdown of one node. */
function inline(node: Node, base: string | undefined): string {
  if (node.nodeType === TEXT) return escapeText(node.textContent ?? "");
  if (!isElement(node)) return "";
  const tag = node.localName;
  if (SKIPPED.has(tag)) return "";
  switch (tag) {
    case "br":
      return BREAK;
    case "img":
      return image(node, base);
    case "code":
    case "kbd":
    case "samp":
    case "tt":
      return codeSpan(node.textContent ?? "");
    case "strong":
    case "b":
      return wrap(inlineChildren(node, base), "**");
    case "em":
    case "i":
    case "cite":
      return wrap(inlineChildren(node, base), "*");
    case "del":
    case "s":
    case "strike":
      return wrap(inlineChildren(node, base), "~~");
    case "a": {
      const text = inlineChildren(node, base);
      const href = resolveUrl(node.getAttribute("href"), base);
      const label = /^(\s*)([\s\S]*?)(\s*)$/.exec(text.replace(new RegExp(BREAK, "g"), " "));
      if (!href || !label?.[2]) return text;
      return `${label[1]}[${label[2]}](${href})${label[3]}`;
    }
    case "iframe":
    case "video":
    case "audio": {
      const src = resolveUrl(
        node.getAttribute("src") ?? node.querySelector("source")?.getAttribute("src") ?? null,
        base,
      );
      return src ? `[Embedded ${tag === "iframe" ? "content" : tag}](${src})` : "";
    }
    default:
      return inlineChildren(node, base);
  }
}

function inlineChildren(el: Element, base: string | undefined): string {
  let out = "";
  for (const child of Array.from(el.childNodes)) out += inline(child, base);
  return out;
}

/** Collapse whitespace in an inline run and turn its `<br>`s into Markdown line breaks. */
function tidyInline(text: string): string {
  return text
    .replace(/[ \t\r\n\f\v\u00a0]+/g, " ")
    .replace(new RegExp(` ?${BREAK} ?`, "g"), BREAK)
    .replace(new RegExp(`^${BREAK}+|${BREAK}+$`, "g"), "")
    .trim()
    .replace(new RegExp(`${BREAK}+`, "g"), "  \n");
}

function paragraph(text: string): string {
  return tidyInline(text).split("\n").map(escapeLineStart).join("\n");
}

function indent(text: string, by: string): string {
  return text
    .split("\n")
    .map((line, i) => (i === 0 || !line ? line : by + line))
    .join("\n");
}

function list(el: Element, base: string | undefined): string {
  const ordered = el.localName === "ol";
  let number = Number.parseInt(el.getAttribute("start") ?? "1", 10);
  if (!Number.isFinite(number)) number = 1;
  const items: string[] = [];
  for (const child of Array.from(el.children)) {
    if (child.localName !== "li") continue;
    const marker = ordered ? `${number++}. ` : "- ";
    const parts = blocksOf(child, base);
    if (parts.length === 0) continue;
    // A nested list sits right under its item's text; other blocks get a blank line.
    let body = parts[0];
    for (const part of parts.slice(1)) body += (/^(- |\d+\. )/.test(part) ? "\n" : "\n\n") + part;
    items.push(marker + indent(body, " ".repeat(marker.length)));
  }
  return items.join("\n");
}

function fenced(el: Element): string {
  const code = el.querySelector("code");
  const language = /(?:^|\s)(?:language|lang)-([\w#+.-]+)/.exec(
    `${el.getAttribute("class") ?? ""} ${code?.getAttribute("class") ?? ""}`,
  )?.[1];
  const text = (el.textContent ?? "")
    .replace(STAND_INS, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\n+|\s+$/g, "");
  if (!text) return "";
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  // Empty lines are marked, so the document's blank-line squeeze leaves the code's own alone.
  const body = text
    .split("\n")
    .map((line) => line || CODE_BLANK_LINE)
    .join("\n");
  return `${fence}${language ?? ""}\n${body}\n${fence}`;
}

function table(el: Element, base: string | undefined): string {
  const rows: string[][] = [];
  for (const row of Array.from(el.querySelectorAll("tr"))) {
    const cells = Array.from(row.children)
      .filter((c) => c.localName === "td" || c.localName === "th")
      .map((c) => tidyInline(inlineChildren(c, base)).replace(/\s*\n/g, " ").replace(/\|/g, "\\|"));
    if (cells.some(Boolean)) rows.push(cells);
  }
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  // One column is a layout table, not data: read it as paragraphs.
  if (width < 2) return rows.map((r) => r[0]).join("\n\n");
  const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? "").join(" | ")} |`;
  return [line(rows[0]), line(Array.from({ length: width }, () => "---")), ...rows.slice(1).map(line)].join("\n");
}

/** One block element as zero or more Markdown blocks. */
function block(el: Element, base: string | undefined): string[] {
  const tag = el.localName;
  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const text = tidyInline(inlineChildren(el, base)).replace(/\s*\n/g, " ");
      return text ? [`${"#".repeat(Number(tag[1]))} ${text}`] : [];
    }
    case "hr":
      return ["---"];
    case "pre":
      return [fenced(el)].filter(Boolean);
    case "ul":
    case "ol":
      return [list(el, base)].filter(Boolean);
    case "table":
      return [table(el, base)].filter(Boolean);
    case "blockquote": {
      const inner = blocksOf(el, base).join("\n\n");
      return inner
        ? [
            inner
              .split("\n")
              .map((line) => (line ? `> ${line}` : ">"))
              .join("\n"),
          ]
        : [];
    }
    case "figcaption": {
      const text = paragraph(inlineChildren(el, base));
      return text ? [wrap(text, "*")] : [];
    }
    default:
      return blocksOf(el, base);
  }
}

/** The Markdown blocks inside a container: its inline runs become paragraphs between its block children. */
function blocksOf(el: Element, base: string | undefined): string[] {
  const out: string[] = [];
  let run = "";
  const flush = () => {
    const text = paragraph(run);
    if (text) out.push(text);
    run = "";
  };
  for (const child of Array.from(el.childNodes)) {
    if (isElement(child) && SKIPPED.has(child.localName)) continue;
    if (isElement(child) && (BLOCK.has(child.localName) || child.localName === "table")) {
      flush();
      out.push(...block(child, base));
    } else {
      run += inline(child, base);
    }
  }
  flush();
  return out;
}

/**
 * Convert article HTML to Markdown. Relative links and images are resolved
 * against `baseUrl`; anything that isn't http(s) or mailto loses its link.
 * `options.image` is called with each image's absolute address and returns
 * what to write in its place (text that is safe inside Markdown's `(...)`).
 */
export function htmlToMarkdown(
  html: string,
  baseUrl?: string,
  options: { image?: (url: string) => string } = {},
): string {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const body = document.body as unknown as Element | null;
  if (!body) return "";
  let blocks: string[];
  writeImage = options.image;
  try {
    blocks = blocksOf(body, baseUrl);
  } finally {
    writeImage = undefined;
  }
  const markdown = blocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(new RegExp(CODE_SPACE, "g"), " ")
    .replace(new RegExp(CODE_TAB, "g"), "\t")
    .replace(new RegExp(CODE_BLANK_LINE, "g"), "");
  return markdown ? `${markdown}\n` : "";
}
