/**
 * Mintlify's `<url>.md` twin is MDX, not plain Markdown: it carries an injected
 * "Documentation Index" preamble, JSX components, raw HTML and inline component
 * definitions, all of which Raycast's `Detail` renders as literal tag soup.
 * This converts the subset CeyPay's docs actually use (surveyed across every
 * indexed page) into Markdown Raycast can display.
 *
 * Fenced code blocks are lifted out before any rewriting and restored at the
 * end, so sample code containing HTML or braces is never touched.
 */

/** Containers that only group their children — the tag itself carries no content. */
const UNWRAPPED = new Set([
  "CardGroup",
  "AccordionGroup",
  "Steps",
  "CodeGroup",
  "Tabs",
  "Frame",
  "Columns",
  "Expandable",
]);

/** Callout components, rendered as a labelled blockquote. */
const CALLOUTS: Record<string, string> = {
  Note: "Note",
  Info: "Info",
  Tip: "Tip",
  Warning: "Warning",
  Check: "Success",
  Danger: "Danger",
};

/** Components whose `title`/`label` becomes a heading for the block that follows. */
const TITLED: Record<string, string> = {
  Card: "title",
  Accordion: "title",
  Step: "title",
  Tab: "title",
};

/** Custom one-off components with no meaningful text content. */
const DROPPED = new Set(["Icon", "Snippet", "GithubRepoCard", "TelegramBanner", "WooCommerceDownload"]);

/** Placeholder standing in for a lifted-out code fence; chosen not to occur in prose. */
const FENCE = "@@ceypay-fence-";

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))?.[1];
}

/** Strips the `> ## Documentation Index` blockquote Mintlify prepends for LLM crawlers. */
function stripPreamble(source: string): string {
  return source.replace(/^(?:>[^\n]*\n)+\n*/, "");
}

/** Lifts fenced code blocks out so later rewriting cannot corrupt sample code. */
function extractFences(source: string): { text: string; fences: string[] } {
  const fences: string[] = [];
  const out: string[] = [];
  let buffer: string[] | null = null;
  let indent = 0;

  const flush = () => {
    if (!buffer) return;
    // A fence indented more than three spaces reads as an indented code block,
    // so strip whatever indentation it inherited from the JSX it sat inside.
    const body = buffer.map((line) => line.slice(Math.min(indent, line.length - line.trimStart().length)));
    out.push(`${FENCE}${fences.length}@@`);
    fences.push(body.join("\n"));
    buffer = null;
  };

  for (const line of source.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      if (buffer) {
        buffer.push(line);
        flush();
      } else {
        indent = line.length - line.trimStart().length;
        buffer = [line];
      }
      continue;
    }
    if (buffer) buffer.push(line);
    else out.push(line);
  }
  flush();

  return { text: out.join("\n"), fences };
}

function restoreFences(source: string, fences: string[]): string {
  return source.replace(/@@ceypay-fence-(\d+)@@/g, (_m, i: string) => fences[Number(i)] ?? "");
}

/**
 * MDX files may define inline React components with bare `export`/`import`
 * statements. That is unfenced JavaScript, so it would otherwise render as body
 * text. Skips each statement by balancing brackets from its first line.
 */
function stripMdxStatements(lines: string[]): string[] {
  const kept: string[] = [];
  let depth = 0;
  let skipping = false;

  for (const line of lines) {
    if (!skipping && /^(export|import)\s/.test(line)) {
      skipping = true;
      depth = 0;
    }
    if (!skipping) {
      kept.push(line);
      continue;
    }
    for (const ch of line) {
      if (ch === "{" || ch === "(") depth++;
      else if (ch === "}" || ch === ")") depth--;
    }
    // JSX bodies contain stray brackets inside attribute strings, so an
    // unbalanced line alone is not the end — require a statement terminator too.
    if (depth <= 0 && /[)};]\s*;?\s*$/.test(line)) skipping = false;
  }
  return kept;
}

/** Flattens a table cell's inline HTML down to something Markdown can hold. */
function cellText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The docs use raw HTML tables, which Raycast renders as literal tags. GFM
 * tables it does render, so rewrite them. Tables without a `<th>` get an empty
 * header row, since GFM has no headerless form.
 */
function convertHtmlTables(source: string): string {
  return source.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => cellText(cell[1])))
      .filter((cells) => cells.length > 0);
    if (rows.length === 0) return "";

    const hasHeader = /<th[\s>]/i.test(table);
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (cells: string[]) => [...cells, ...Array(width - cells.length).fill("")];
    const header = hasHeader ? pad(rows[0]) : Array<string>(width).fill("");
    const body = hasHeader ? rows.slice(1) : rows;

    return [
      "",
      `| ${header.join(" | ")} |`,
      `| ${Array(width).fill("---").join(" | ")} |`,
      ...body.map((cells) => `| ${pad(cells).join(" | ")} |`),
      "",
    ].join("\n");
  });
}

/**
 * Removes leftover raw HTML and JSX layout wrappers (`<div style={{…}}>`).
 * Opening tags may span several lines, so this runs on the whole document —
 * safe because code fences have already been lifted out.
 */
function stripRawHtml(source: string): string {
  return source.replace(/<\/?[a-z][a-zA-Z0-9-]*(?:\s[^<>]*)?\/?>/g, "");
}

const IMAGE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** `…/BybitPay-Dark.svg?s=<hash>` — the CDN hash differs per variant, so compare paths only. */
function imageKey(alt: string, url: string): string {
  return `${alt}|${url.split("?")[0].replace(/[-_][Dd]ark(?=\.|$)/, "")}`;
}

function isDarkVariant(url: string): boolean {
  return /[-_][Dd]ark(\.|$)/.test(url.split("?")[0]);
}

/**
 * The docs ship light and dark artwork as an adjacent pair sharing one alt text,
 * relying on CSS to hide the wrong one. Raycast renders both, so keep only the
 * variant matching the current appearance — a light-mode logo on Raycast's dark
 * background is close to invisible.
 */
function dedupeThemeImages(source: string, preferDark: boolean): string {
  const variants = new Map<string, boolean[]>();
  for (const match of source.matchAll(IMAGE)) {
    const key = imageKey(match[1], match[2]);
    variants.set(key, [...(variants.get(key) ?? []), isDarkVariant(match[2])]);
  }

  const emitted = new Set<string>();
  return source.replace(IMAGE, (match, alt: string, url: string) => {
    const key = imageKey(alt, url);
    const group = variants.get(key) ?? [];
    if (group.length < 2) return match;
    if (emitted.has(key)) return "";
    // Skip this one if the variant we actually want appears elsewhere in the pair.
    if (isDarkVariant(url) !== preferDark && group.includes(preferDark)) return "";
    emitted.add(key);
    return match;
  });
}

/**
 * Text left behind by stripped JSX keeps the wrapper's indentation, and four
 * spaces would render as a code block. Real code is always fenced (and already
 * lifted out), so clamp anything deeper — leaving list markers alone, since
 * Markdown needs their indentation to nest.
 */
function clampIndent(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const leading = line.length - line.trimStart().length;
      if (leading < 4 || /^\s*([-*+]|\d+\.)\s/.test(line)) return line;
      return `   ${line.trimStart()}`;
    })
    .join("\n");
}

function dedent(line: string, depth: number): string {
  if (depth <= 0) return line;
  const leading = line.length - line.trimStart().length;
  return line.slice(Math.min(leading, depth * 2));
}

/**
 * Handles components written inline rather than on their own line, e.g.
 * `<Step title="Install">Run npm i</Step>`.
 */
function inlineTags(line: string): string {
  return line
    .replace(/<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g, (_tag, name: string, attrs: string) => {
      if (name in TITLED) {
        const title = attr(attrs, TITLED[name]);
        return title ? `\n\n### ${title}\n\n` : "";
      }
      if (name in CALLOUTS) return `\n\n> **${CALLOUTS[name]}** `;
      return "";
    })
    .replace(/<\/[A-Z][A-Za-z0-9]*>/g, "");
}

/**
 * Mintlify emits the page description as a blockquote under the title. Raycast
 * draws blockquotes with a theme-coloured bar that an extension cannot restyle,
 * and a subtitle is not really a quotation, so render it as emphasis instead.
 * Callouts keep their blockquote, where the bar reads as intended.
 */
function unquoteDescription(source: string): string {
  return source.replace(/^(#[^\n]*\n+)((?:>[^\n]*\n?)+)/, (_match, heading: string, quote: string) => {
    const text = quote
      .split("\n")
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
    return text ? `${heading}*${text}*\n` : heading;
  });
}

/** Reads a JSX array attribute, e.g. `tags={["Features", "New Release"]}`. */
function attrArray(attrs: string, name: string): string[] {
  const raw = attrs.match(new RegExp(`\\b${name}\\s*=\\s*\\{\\[([^\\]]*)\\]\\}`))?.[1];
  if (!raw) return [];
  return [...raw.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]).filter(Boolean);
}

/** Changelog entries label themselves `2026-07-17`; show that the way a reader expects. */
function formatIsoDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function renderOpeningTag(name: string, attrs: string, out: string[]): void {
  if (UNWRAPPED.has(name)) return;

  // A changelog entry: a dated, tagged section rather than a plain heading.
  if (name === "Update") {
    const label = attr(attrs, "label");
    const tags = attrArray(attrs, "tags");
    const meta = [label && `**${formatIsoDate(label)}**`, tags.length > 0 && `\`${tags.join("` `")}\``]
      .filter(Boolean)
      .join(" · ");
    out.push("", "---", "", meta, "");
    return;
  }

  if (name in CALLOUTS) {
    out.push("", `> **${CALLOUTS[name]}**`, ">");
    return;
  }
  if (name in TITLED) {
    const title = attr(attrs, TITLED[name]);
    if (title) out.push("", `### ${title}`, "");
    return;
  }
  if (name === "ResponseField" || name === "ParamField") {
    const field = attr(attrs, "name") ?? attr(attrs, "query") ?? attr(attrs, "path");
    const type = attr(attrs, "type");
    const parts = [
      field ? `**${field}**` : "",
      type ? `\`${type}\`` : "",
      /\brequired\b/.test(attrs) ? "*(required)*" : "",
    ];
    out.push("", parts.filter(Boolean).join(" "), "");
  }
}

/** `preferDark` should follow Raycast's current appearance; see `dedupeThemeImages`. */
export function mintlifyToMarkdown(source: string, preferDark = true): string {
  const { text, fences } = extractFences(stripPreamble(source));

  let normalised = convertHtmlTables(text).replace(/<br\s*\/?>/gi, "  \n");
  normalised = normalised.replace(/<img\b([^>]*?)\/?>/g, (_tag, attrs: string) => {
    const src = attr(attrs, "src");
    if (!src) return "";
    // `alt` often wraps across lines in the source; a newline would break the
    // image syntax, so flatten it to a single line.
    const alt = (attr(attrs, "alt") ?? "").replace(/\s+/g, " ").trim();
    return `![${alt}](${src})`;
  });

  const lines = stripMdxStatements(normalised.split("\n"));
  const out: string[] = [];
  // Mintlify indents JSX children two spaces per level; four-space indentation
  // would otherwise render as a code block, so track depth and dedent by it.
  let depth = 0;

  for (const rawLine of lines) {
    let line = rawLine;
    for (const name of DROPPED) {
      line = line.replace(new RegExp(`</?${name}\\b[^>]*/?>`, "g"), "");
    }

    const opening = line.match(/^\s*<([A-Z][A-Za-z0-9]*)\b([^>]*?)(\/?)>\s*$/);
    if (opening) {
      const [, name, attrs, selfClosing] = opening;
      renderOpeningTag(name, attrs, out);
      if (!selfClosing) depth++;
      continue;
    }

    if (/^\s*<\/[A-Z][A-Za-z0-9]*>\s*$/.test(line)) {
      depth = Math.max(0, depth - 1);
      out.push("");
      continue;
    }

    out.push(dedent(inlineTags(line), depth));
  }

  const body = unquoteDescription(clampIndent(dedupeThemeImages(stripRawHtml(out.join("\n")), preferDark)).trimStart());
  return restoreFences(body, fences)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
