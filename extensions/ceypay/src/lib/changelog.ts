import { mintlifyToMarkdown } from "./mintlify";
import type { ChangelogEntry, DocPage } from "./types";

/**
 * The changelog pages are one MDX document holding many `<Update>` blocks. Read
 * whole, they render as a single wall of text; split per entry they behave like
 * a changelog — one row each, with its own date, tags and screenshot.
 */

/** Reads a JSX array attribute, e.g. `tags={["Features", "New Release"]}`. */
function attrArray(attrs: string, name: string): string[] {
  const raw = attrs.match(new RegExp(`\\b${name}\\s*=\\s*\\{\\[([^\\]]*)\\]\\}`))?.[1];
  if (!raw) return [];
  return [...raw.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]).filter(Boolean);
}

export function formatEntryDate(value: string | undefined): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Full date for the detail pane, where there is room for it. */
export function formatEntryDateLong(value: string | undefined): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * An `<Update>` body is indented inside its tag. Splitting the block loses that
 * context, so remove the indentation the whole body shares before converting.
 */
function stripCommonIndent(body: string): string {
  const lines = body.split("\n");
  const first = lines.find((line) => line.trim().length > 0);
  if (!first) return body;

  // Taken from the first real line rather than the minimum across all of them:
  // attribute values wrap mid-tag and sit at column zero, which would otherwise
  // drag the common indent to nothing.
  const width = first.length - first.trimStart().length;
  if (width === 0) return body;

  return lines.map((line) => line.slice(Math.min(width, line.length - line.trimStart().length))).join("\n");
}

export function parseChangelog(source: string, page: DocPage, preferDark: boolean): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // Entries are sequential, so each chunk runs from its opening tag to its close.
  const chunks = source.split(/<Update\b/).slice(1);

  for (const chunk of chunks) {
    const close = chunk.indexOf("</Update>");
    const inner = close === -1 ? chunk : chunk.slice(0, close);

    const gt = inner.indexOf(">");
    if (gt === -1) continue;
    const attrs = inner.slice(0, gt);
    const body = inner.slice(gt + 1);

    const date = attrs.match(/\blabel\s*=\s*"([^"]*)"/)?.[1];
    const tags = attrArray(attrs, "tags");

    const markdown = mintlifyToMarkdown(stripCommonIndent(body), preferDark);

    // The first heading is the entry's headline; it becomes the row title, so
    // drop it from the body to avoid repeating it under the navigation bar.
    const heading = markdown.match(/^#{1,6}\s+(.+)$/m);
    const title = heading?.[1].trim() ?? date ?? "Update";
    const rest = heading ? markdown.replace(heading[0], "").trim() : markdown;

    entries.push({
      id: `${page.slug}#${date ?? entries.length}`,
      date,
      title,
      tags,
      markdown: rest,
      image: markdown.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1],
      source: page.title,
      url: date ? `${page.url}#${date}` : page.url,
    });
  }

  return entries;
}

/** Newest first, matching how a changelog is read. */
export function sortEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
