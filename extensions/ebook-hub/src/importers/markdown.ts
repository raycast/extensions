import type { NewChapter } from "../domain/book";
import { countWords, markdownToPlainText, splitList } from "../domain/text";
import { decodeText } from "./decode";
import type { ImportedBook, Importer } from "./types";

const FENCE = /^\s*(```|~~~)/;
const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FRONT_MATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;

interface Heading {
  line: number;
  level: number;
  text: string;
}

interface FrontMatter {
  title?: string;
  authors?: string[];
  language?: string;
}

function findHeadings(lines: readonly string[]): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }
    const match = inFence ? null : ATX_HEADING.exec(line);
    if (match) {
      headings.push({ line: index, level: match[1].length, text: markdownToPlainText(match[2]) });
    }
  });
  return headings;
}

function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

function parseFrontMatter(block: string): FrontMatter {
  const result: FrontMatter = {};
  for (const line of block.split("\n")) {
    const match = /^(\w+)\s*:\s*(.+)$/.exec(line);
    if (!match) {
      continue;
    }
    const key = match[1].toLowerCase();
    const value = unquote(match[2]);
    if (key === "title") {
      result.title = value;
    } else if (key === "author" || key === "authors") {
      result.authors = splitList(value.replace(/^\[|\]$/g, "")).map(unquote);
    } else if (key === "language" || key === "lang") {
      result.language = value;
    }
  }
  return result;
}

export function splitMarkdownChapters(
  markdown: string,
  fallbackTitle: string,
): { title: string; chapters: NewChapter[] } {
  const lines = markdown.split("\n");
  const headings = findHeadings(lines);
  const h1 = headings.filter((heading) => heading.level === 1);
  const h2 = headings.filter((heading) => heading.level === 2);

  let title = fallbackTitle;
  let splitAt: Heading[] = [];
  let titleHeading: Heading | null = null;

  if (h1.length >= 2) {
    splitAt = h1;
  } else if (h1.length === 1) {
    title = h1[0].text;
    titleHeading = h1[0];
    splitAt = h2.length >= 2 ? h2 : [];
  } else if (h2.length >= 2) {
    splitAt = h2;
  }

  if (splitAt.length === 0) {
    return { title, chapters: [{ title, markdown }] };
  }

  const chapters: NewChapter[] = [];
  const preface = lines.slice(0, splitAt[0].line).filter((_, index) => index !== titleHeading?.line);
  if (countWords(preface.join("\n")) > 0) {
    chapters.push({ title: "Introduction", markdown: preface.join("\n") });
  }
  splitAt.forEach((heading, index) => {
    const end = splitAt[index + 1]?.line ?? lines.length;
    chapters.push({ title: heading.text, markdown: lines.slice(heading.line, end).join("\n") });
  });
  return { title, chapters };
}

export function importMarkdownString(text: string, fallbackTitle: string): ImportedBook {
  const frontMatter = FRONT_MATTER.exec(text);
  const meta = frontMatter ? parseFrontMatter(frontMatter[1]) : {};
  const body = frontMatter ? text.slice(frontMatter[0].length) : text;
  const { title, chapters } = splitMarkdownChapters(body, meta.title ?? fallbackTitle);
  return {
    title: meta.title ?? title,
    authors: meta.authors ?? [],
    language: meta.language ?? null,
    chapters,
    warnings: [],
  };
}

export const importMarkdown: Importer = (data, fallbackTitle) =>
  Promise.resolve(importMarkdownString(decodeText(data), fallbackTitle));
