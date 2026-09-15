import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import type { DocumentEvidence } from "./types";

const run = promisify(execFile);
const SAMPLE_LIMIT = 80_000;

export async function extractDocumentEvidence(
  path: string,
): Promise<DocumentEvidence> {
  const extension = extname(path).slice(1).toLowerCase();
  const metadata = await spotlightMetadata(path);
  const directText = await extractDirectText(path, extension);
  const ocr =
    extension === "pdf"
      ? await recognizePdf(path)
      : directRecognition(directText);
  const combined = [directText, ocr.text].filter(Boolean).join("\n");
  const ocrIdentity = inferIdentity(ocr.text);
  return {
    doi: findDoi(combined),
    isbn: findIsbn(combined),
    embeddedTitle: metadata.title,
    embeddedAuthors: metadata.authors,
    ocrTitle: ocrIdentity.title,
    ocrAuthors: ocrIdentity.authors,
    ocrText: ocr.text.slice(0, 20_000),
    textSample: directText.slice(0, SAMPLE_LIMIT),
    ocrMethod: ocr.method,
    ocrCompleted: ocr.completed,
  };
}

async function spotlightMetadata(
  path: string,
): Promise<{ title?: string; authors: string[] }> {
  try {
    const [rawTitle, rawAuthors] = await Promise.all([
      spotlightField(path, "kMDItemTitle"),
      spotlightField(path, "kMDItemAuthors"),
    ]);
    const title = cleanSpotlightScalar(rawTitle);
    const authors = [...rawAuthors.matchAll(/"([^"]+)"/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);
    return { title, authors };
  } catch {
    return { authors: [] };
  }
}

async function spotlightField(path: string, field: string): Promise<string> {
  const { stdout } = await run(
    "/usr/bin/mdls",
    ["-raw", "-name", field, path],
    { timeout: 8_000, maxBuffer: 512_000 },
  );
  return stdout.trim();
}

function cleanSpotlightScalar(value: string): string | undefined {
  if (!value || value === "(null)") return undefined;
  return value.replace(/^"|"$/g, "").trim() || undefined;
}

async function extractDirectText(
  path: string,
  extension: string,
): Promise<string> {
  if (["txt", "tex", "md", "html", "xml"].includes(extension)) {
    return (await readFile(path, "utf8")).slice(0, SAMPLE_LIMIT);
  }
  if (["doc", "docx", "rtf"].includes(extension)) {
    try {
      const { stdout } = await run(
        "/usr/bin/textutil",
        ["-convert", "txt", "-stdout", path],
        { timeout: 15_000, maxBuffer: SAMPLE_LIMIT * 2 },
      );
      return stdout.slice(0, SAMPLE_LIMIT);
    } catch {
      return "";
    }
  }
  if (extension === "pdf") {
    const spotlight = await spotlightText(path);
    if (spotlight.length > 80) return spotlight.slice(0, SAMPLE_LIMIT);
    // DOI and ISBN strings are frequently recoverable even when Spotlight has not indexed the PDF.
    try {
      const bytes = await readFile(path);
      return bytes
        .subarray(0, Math.min(bytes.length, 12_000_000))
        .toString("latin1");
    } catch {
      return "";
    }
  }
  return "";
}

async function spotlightText(path: string): Promise<string> {
  try {
    const { stdout } = await run(
      "/usr/bin/mdls",
      ["-raw", "-name", "kMDItemTextContent", path],
      { timeout: 10_000, maxBuffer: SAMPLE_LIMIT * 2 },
    );
    return stdout === "(null)\n" ? "" : stdout;
  } catch {
    return "";
  }
}

async function recognizePdf(path: string): Promise<{
  text: string;
  completed: boolean;
  method: DocumentEvidence["ocrMethod"];
}> {
  try {
    const script = join(environment.assetsPath, "ocr-pdf.js");
    const { stdout } = await run(
      "/usr/bin/osascript",
      ["-l", "JavaScript", script, path, "3"],
      { timeout: 75_000, maxBuffer: 2_000_000 },
    );
    const text = stdout.trim();
    return { text, completed: text.length > 20, method: "apple-vision" };
  } catch {
    return { text: "", completed: false, method: "unavailable" };
  }
}

function directRecognition(text: string): {
  text: string;
  completed: boolean;
  method: DocumentEvidence["ocrMethod"];
} {
  const sample = text.slice(0, 20_000);
  return {
    text: sample,
    completed: sample.trim().length > 20,
    method: "direct-text",
  };
}

function findDoi(value: string): string | undefined {
  return value
    .match(/10\.\d{4,9}\/[A-Z0-9._;()/:+-]+/i)?.[0]
    ?.replace(/[),.;]+$/, "")
    .toLowerCase();
}

function findIsbn(value: string): string | undefined {
  const matches =
    value.match(
      /(?:ISBN(?:-1[03])?\s*:?[ ]*)?(?:97[89][- ]?)?[0-9][- 0-9]{8,15}[0-9X]/gi,
    ) ?? [];
  for (const match of matches) {
    const normalized = match
      .replace(/^ISBN(?:-1[03])?\s*:?[ ]*/i, "")
      .replace(/[^0-9X]/gi, "");
    if (
      (normalized.length === 10 || normalized.length === 13) &&
      validIsbn(normalized)
    )
      return normalized;
  }
  return undefined;
}

function validIsbn(value: string): boolean {
  if (value.length === 13) {
    const sum = value
      .split("")
      .reduce(
        (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
        0,
      );
    return sum % 10 === 0;
  }
  const sum = value
    .split("")
    .reduce(
      (total, digit, index) =>
        total +
        (digit.toUpperCase() === "X" ? 10 : Number(digit)) * (10 - index),
      0,
    );
  return sum % 11 === 0;
}

function inferIdentity(text: string): { title?: string; authors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3 && line.length <= 240)
    .slice(0, 80);
  const titleIndex = lines.findIndex(isProbableTitle);
  if (titleIndex < 0) return { authors: [] };
  const title = lines[titleIndex];
  const authors = lines
    .slice(titleIndex + 1, titleIndex + 8)
    .filter(isProbableAuthorLine)
    .flatMap((line) => line.split(/\s*(?:,|;|\band\b|\be\b|&|·)\s*/i))
    .map((author) => author.replace(/\d|\*|†|‡/g, "").trim())
    .filter((author) => author.split(" ").length >= 2 && author.length <= 100)
    .slice(0, 8);
  return { title, authors };
}

function isProbableTitle(line: string): boolean {
  if (line.length < 8 || line.split(" ").length < 2) return false;
  if (
    /^(abstract|resumo|contents|sum[aá]rio|doi|isbn|issn|volume|journal)\b/i.test(
      line,
    )
  )
    return false;
  if (/^(https?:|www\.)/i.test(line)) return false;
  const letters = (line.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  return letters / line.length > 0.55;
}

function isProbableAuthorLine(line: string): boolean {
  if (
    /\b(university|universidade|institute|department|abstract|resumo|doi|received|published|journal)\b/i.test(
      line,
    )
  )
    return false;
  if (/[.!?]$/.test(line) || line.length > 160) return false;
  const words = line.split(" ");
  return words.length >= 2 && words.length <= 16 && /[A-Za-zÀ-ÿ]/.test(line);
}
