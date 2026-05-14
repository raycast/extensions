import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Dataset, Frontmatter, ReferenceIndexItem } from "../types";

export interface BuildOptions {
  sourceLabel?: string;
  version?: string;
  limit?: number;
}

const GITHUB_BASE =
  "https://github.com/Fechin/reference/blob/main/source/_posts";

const MAX_HEADINGS = 12;
const MAX_SNIPPET_LINES = 12;

export async function buildDatasetFromDir(
  postsDir: string,
  options: BuildOptions = {},
): Promise<Dataset> {
  const files = (await fs.promises.readdir(postsDir))
    .filter((file) => file.endsWith(".md"))
    .sort();

  const limitedFiles =
    options.limit && options.limit > 0 ? files.slice(0, options.limit) : files;

  const entries = await Promise.all(
    limitedFiles.map(async (file) => {
      const filePath = path.join(postsDir, file);
      const raw = await fs.promises.readFile(filePath, "utf8");
      return parseMarkdownFile(file, raw);
    }),
  );

  const index: ReferenceIndexItem[] = entries.map((entry) => entry.index);
  const content = entries.reduce<Record<string, string>>((acc, entry) => {
    acc[entry.index.id] = entry.content;
    return acc;
  }, {});

  const dataset: Dataset = {
    meta: {
      source: options.sourceLabel ?? "Fechin/reference",
      generatedAt: new Date().toISOString(),
      total: index.length,
      version: options.version,
    },
    index,
    content,
  };

  return dataset;
}

function parseMarkdownFile(
  filename: string,
  raw: string,
): { index: ReferenceIndexItem; content: string } {
  const { data, content } = matter(raw);
  const frontmatter = data as Frontmatter;

  const id = slugFromFilename(filename);
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim().length > 0
      ? frontmatter.title.trim()
      : id;
  const category = selectFirstString(frontmatter.categories) ?? "General";
  const tags = sanitizeStringArray(frontmatter.tags);
  const summary = deriveSummary(content, frontmatter.intro);
  const headings = extractHeadings(content);
  const topSnippet = extractTopSnippet(content);
  const link = `${GITHUB_BASE}/${filename}`;

  const index: ReferenceIndexItem = {
    id,
    title,
    category,
    tags,
    summary,
    headings,
    topSnippet,
    path: filename,
    link,
  };

  return { index, content: sanitizeContent(content.trim()) };
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

function sanitizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}

function selectFirstString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function deriveSummary(body: string, intro?: string): string {
  if (intro && intro.trim().length > 0) {
    return cleanWhitespace(intro);
  }

  const paragraphs = body.split(/\n{2,}/);
  const firstParagraph = paragraphs.find(
    (paragraph) =>
      paragraph.trim().length > 0 && !paragraph.trim().startsWith("#"),
  );

  if (firstParagraph) {
    return cleanWhitespace(firstParagraph);
  }

  const firstLine = body.split(/\r?\n/).find((line) => line.trim().length > 0);
  return firstLine ? cleanWhitespace(firstLine) : "";
}

function extractHeadings(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const headings: string[] = [];

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (match) {
      headings.push(cleanHeading(match[2]));
      if (headings.length >= MAX_HEADINGS) break;
    }
  }

  return headings;
}

function cleanHeading(heading: string): string {
  return cleanWhitespace(heading.replace(/\{.*\}/, ""));
}

function extractTopSnippet(markdown: string): string | undefined {
  const codeFenceMatch = markdown.match(/```[\s\S]*?```/);
  if (codeFenceMatch) {
    return trimSnippet(codeFenceMatch[0]);
  }

  const listMatch = markdown.match(/^-\s+.+$/m);
  if (listMatch) {
    return cleanWhitespace(listMatch[0]);
  }

  return undefined;
}

function trimSnippet(snippet: string): string {
  const lines = snippet.split(/\r?\n/);
  const innerLines = lines.slice(1, lines.length - 1); // drop fences
  const truncated = innerLines.slice(0, MAX_SNIPPET_LINES);
  return truncated.join("\n").trim();
}

function sanitizeContent(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // Remove standalone annotation lines: {.shortcuts}, {.marker-none}, etc.
      if (/^\s*\{[.#][a-zA-Z][-a-zA-Z0-9 .#]*\}\s*$/.test(line)) {
        return "";
      }
      // Remove annotations from code fence openings: ```html {.wrap} -> ```html
      line = line.replace(/^(```\S*)\s*\{[.#][^}]*\}/, "$1");
      // Remove class/id annotations from headings and inline content
      line = line.replace(/\s*\{[.#][a-zA-Z][-a-zA-Z0-9 .#]*\}/g, "");
      // Remove custom Hexo theme HTML tags: <yel>, </pur>, <shell>, etc.
      line = line.replace(/<\/?(yel|pur|shell|motion|operator)>/gi, "");
      return line;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
