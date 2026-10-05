import { extractText, getDocumentProxy, getMeta } from "unpdf";

import type { NewChapter } from "../domain/book";
import { escapeMarkdownLine, splitList } from "../domain/text";
import { isRecord } from "../domain/validation";
import { ImportError, type Importer } from "./types";

type PdfDocument = Awaited<ReturnType<typeof getDocumentProxy>>;

const PAGES_PER_FALLBACK_CHAPTER = 10;
const MIN_CHARACTERS_PER_PAGE = 20;
const EDGE_LINES = 2;
const MIN_BOILERPLATE_PAGES = 3;
const PAGE_NUMBER = /^(page\s+)?\d{1,4}(\s*(\/|of)\s*\d{1,4})?$/i;
const SENTENCE_END = /[.!?…:;"”’)\]]$/;

export const PDF_QUALITY_WARNING =
  "PDF text extraction is approximate: multi-column layouts, tables, and footnotes may read poorly.";

interface PageRange {
  title: string;
  start: number;
  end: number;
}

function splitLines(pageText: string): string[] {
  return pageText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "");
}

function lineSignature(line: string): string {
  return line.toLowerCase().replace(/\d+/g, "#");
}

function isEdge(index: number, length: number): boolean {
  return index < EDGE_LINES || index >= length - EDGE_LINES;
}

/** Drop running headers/footers and page numbers that repeat across pages. */
export function removeRunningBoilerplate(pages: readonly string[][]): string[][] {
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const signatures = new Set(lines.filter((_, index) => isEdge(index, lines.length)).map(lineSignature));
    signatures.forEach((signature) => counts.set(signature, (counts.get(signature) ?? 0) + 1));
  }
  const threshold = Math.max(MIN_BOILERPLATE_PAGES, Math.ceil(pages.length / 2));

  return pages.map((lines) =>
    lines.filter((line, index) => {
      if (!isEdge(index, lines.length)) {
        return true;
      }
      if (PAGE_NUMBER.test(line)) {
        return false;
      }
      return (counts.get(lineSignature(line)) ?? 0) < threshold;
    }),
  );
}

/** Rebuild paragraphs from visual lines: join hyphenation, break after short sentence-final lines. */
export function linesToMarkdown(lines: readonly string[]): string {
  if (lines.length === 0) {
    return "";
  }
  const lengths = lines.map((line) => line.length).sort((a, b) => a - b);
  const fullLineLength = lengths[Math.floor(lengths.length * 0.75)];

  const paragraphs: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current === "") {
      current = line;
    } else if (/\p{L}-$/u.test(current) && /^\p{Ll}/u.test(line)) {
      current = `${current.slice(0, -1)}${line}`;
    } else {
      current = `${current} ${line}`;
    }
    if (SENTENCE_END.test(line) && line.length < fullLineLength * 0.8) {
      paragraphs.push(current);
      current = "";
    }
  }
  if (current !== "") {
    paragraphs.push(current);
  }
  return paragraphs.map(escapeMarkdownLine).join("\n\n");
}

async function resolveDestinationPage(pdf: PdfDocument, destination: unknown): Promise<number | null> {
  try {
    const explicit: unknown = typeof destination === "string" ? await pdf.getDestination(destination) : destination;
    if (!Array.isArray(explicit) || explicit.length === 0) {
      return null;
    }
    const target: unknown = explicit[0];
    if (typeof target === "number") {
      return Number.isInteger(target) ? target : null;
    }
    if (isRecord(target) && typeof target.num === "number" && typeof target.gen === "number") {
      return await pdf.getPageIndex({ num: target.num, gen: target.gen });
    }
    return null;
  } catch {
    // A broken outline entry should not fail the import; the entry is ignored.
    return null;
  }
}

async function outlineStarts(pdf: PdfDocument): Promise<{ title: string; page: number }[]> {
  let outline: Awaited<ReturnType<PdfDocument["getOutline"]>>;
  try {
    outline = await pdf.getOutline();
  } catch {
    // The outline is optional metadata; fall back to fixed page ranges.
    return [];
  }
  if (!outline) {
    return [];
  }

  const starts: { title: string; page: number }[] = [];
  for (const item of outline) {
    const page = await resolveDestinationPage(pdf, item.dest);
    if (page !== null) {
      starts.push({ title: item.title.trim() || `Section ${starts.length + 1}`, page });
    }
  }
  starts.sort((a, b) => a.page - b.page);
  return starts.filter((start, index) => index === 0 || start.page !== starts[index - 1].page);
}

export function fixedPageRanges(totalPages: number, pagesPerChapter = PAGES_PER_FALLBACK_CHAPTER): PageRange[] {
  const ranges: PageRange[] = [];
  for (let start = 0; start < totalPages; start += pagesPerChapter) {
    const end = Math.min(start + pagesPerChapter, totalPages);
    ranges.push({ title: end - start === 1 ? `Page ${start + 1}` : `Pages ${start + 1}–${end}`, start, end });
  }
  return ranges;
}

async function chapterRanges(pdf: PdfDocument, totalPages: number): Promise<PageRange[]> {
  const starts = (await outlineStarts(pdf)).filter((start) => start.page < totalPages);
  if (starts.length < 2) {
    return fixedPageRanges(totalPages);
  }
  const ranges: PageRange[] = [];
  if (starts[0].page > 0) {
    ranges.push({ title: "Front Matter", start: 0, end: starts[0].page });
  }
  starts.forEach((start, index) => {
    ranges.push({ title: start.title, start: start.page, end: starts[index + 1]?.page ?? totalPages });
  });
  return ranges;
}

function metaString(info: Record<string, unknown>, key: string): string | null {
  const value = info[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && error.name === "PasswordException";
}

export const importPdf: Importer = async (data, fallbackTitle) => {
  let pdf: PdfDocument;
  try {
    // Copy: PDF.js may transfer (detach) the buffer it is given.
    pdf = await getDocumentProxy(new Uint8Array(data));
  } catch (error) {
    const message = isPasswordError(error)
      ? "Password-protected PDFs are not supported."
      : "This file is not a readable PDF.";
    throw new ImportError(message, { cause: error });
  }

  try {
    const { totalPages, text } = await extractText(pdf, { mergePages: false });
    const pageTexts = Array.isArray(text) ? text : [text];
    const visibleCharacters = pageTexts.reduce((sum, page) => sum + page.replace(/\s/g, "").length, 0);
    if (visibleCharacters < totalPages * MIN_CHARACTERS_PER_PAGE) {
      throw new ImportError("This PDF has no text layer (it looks scanned). OCR is not supported.");
    }

    let info: Record<string, unknown> = {};
    try {
      info = (await getMeta(pdf)).info;
    } catch {
      // Metadata is optional; the file name is used as the title instead.
    }

    const pages = removeRunningBoilerplate(pageTexts.map(splitLines));
    const chapters: NewChapter[] = (await chapterRanges(pdf, totalPages)).map((range) => ({
      title: range.title,
      markdown: linesToMarkdown(pages.slice(range.start, range.end).flat()),
    }));

    const author = metaString(info, "Author");
    return {
      title: metaString(info, "Title") ?? fallbackTitle,
      authors: author ? splitList(author.replace(/\s+(and|&)\s+/gi, ",")) : [],
      language: null,
      chapters,
      warnings: [PDF_QUALITY_WARNING],
    };
  } catch (error) {
    if (error instanceof ImportError) {
      throw error;
    }
    throw new ImportError("Could not extract text from this PDF.", { cause: error });
  } finally {
    // PDF.js v5 releases a document through its loading task (same as unpdf internally).
    await pdf.loadingTask.destroy();
  }
};
