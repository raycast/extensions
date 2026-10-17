import type { NewChapter } from "../domain/book";
import { countWords, escapeMarkdownLine } from "../domain/text";
import { decodeText } from "./decode";
import type { ImportedBook, Importer } from "./types";

/** `Chapter 1`, `CHƯƠNG IV: Mở đầu`, `Part II`, `Phần 2`, `Hồi 3`, … */
const CHAPTER_HEADING = /^(chapter|chương|part|phần|book|quyển|hồi)\s+(\d+|[ivxlcdm]+)\b.{0,80}$/iu;

function toMarkdown(lines: readonly string[]): string {
  return lines.map((line) => (line.trim() === "" ? "" : escapeMarkdownLine(line))).join("\n");
}

export function importPlainTextString(text: string, fallbackTitle: string): ImportedBook {
  const lines = text.split("\n").map((line) => line.trimEnd());
  const headingLines = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line, index }) => CHAPTER_HEADING.test(line) && (index === 0 || lines[index - 1].trim() === ""));

  const book = { title: fallbackTitle, authors: [], language: null, warnings: [] };
  if (headingLines.length < 2) {
    return { ...book, chapters: [{ title: fallbackTitle, markdown: toMarkdown(lines) }] };
  }

  const chapters: NewChapter[] = [];
  const preface = lines.slice(0, headingLines[0].index);
  if (countWords(preface.join(" ")) > 0) {
    chapters.push({ title: "Introduction", markdown: toMarkdown(preface) });
  }
  headingLines.forEach((heading, position) => {
    const end = headingLines[position + 1]?.index ?? lines.length;
    const body = toMarkdown(lines.slice(heading.index + 1, end));
    chapters.push({ title: heading.line, markdown: `## ${escapeMarkdownLine(heading.line)}\n\n${body}` });
  });
  return { ...book, chapters };
}

export const importPlainText: Importer = (data, fallbackTitle) =>
  Promise.resolve(importPlainTextString(decodeText(data), fallbackTitle));
