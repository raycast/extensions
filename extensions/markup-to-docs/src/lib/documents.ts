import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import puppeteer from "puppeteer";

const execFileAsync = promisify(execFile);
const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*]/g;
const PDF_RENDER_TIMEOUT_MS = 20_000;
const TEXTUTIL_CONVERT_TIMEOUT_MS = 15_000;
const DEFAULT_DOCUMENT_CSS = `
:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 48px;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
  line-height: 1.6;
  color: #111827;
  background: #f8fafc;
}

main {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

h1,
h2,
h3 {
  line-height: 1.2;
  color: #0f172a;
  margin-top: 0;
}

p {
  margin: 0 0 1em;
}

code,
pre {
  font-family: "SF Mono", "Menlo", "Monaco", monospace;
}

pre {
  background: #f1f5f9;
  padding: 16px;
  border-radius: 12px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}

th,
td {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  text-align: left;
}
`;

export type FileType = "pdf" | "docx" | "odt" | "rtf";

export type ConvertDocumentInput = {
  html: string;
  css?: string;
  fileType: FileType;
  outputPath: string;
};

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

export function resolveOutputDirectory(outputDirectory: string): string {
  const normalized = outputDirectory.trim();
  if (!normalized) {
    throw new Error("outputDirectory is required");
  }

  return expandHomeDirectory(normalized);
}

export function createOutputFilePath(args: { outputDirectory: string; fileType: FileType; fileName?: string }): string {
  const baseName = sanitizeFileName(removeFileExtension(args.fileName?.trim() || `document-${buildTimestampString()}`));
  return path.join(args.outputDirectory, `${baseName}.${args.fileType}`);
}

export async function convertHtmlToFile(input: ConvertDocumentInput): Promise<void> {
  const htmlDocument = buildHtmlDocument(input.html, input.css);
  if (input.fileType === "pdf") {
    await convertToPdf(htmlDocument, input.outputPath);
    return;
  }

  await convertWithTextUtil(input.fileType, htmlDocument, input.outputPath);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildHtmlDocument(html: string, css?: string): string {
  const content = html.trim();
  const effectiveCss = css?.trim() || DEFAULT_DOCUMENT_CSS;
  const styleBlock = `<style>${effectiveCss}</style>`;
  const hasHtmlTag = /<html[\s>]/i.test(content);

  if (!hasHtmlTag) {
    return `<!doctype html><html><head><meta charset="utf-8">${styleBlock}</head><body><main>${content}</main></body></html>`;
  }

  if (/<\/head>/i.test(content)) {
    return content.replace(/<\/head>/i, `${styleBlock}</head>`);
  }

  return content.replace(/<html[^>]*>/i, (match) => `${match}<head>${styleBlock}</head>`);
}

async function convertToPdf(htmlDocument: string, outputPath: string): Promise<void> {
  const browser = await withTimeout(
    puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
    }),
    PDF_RENDER_TIMEOUT_MS,
    "Timed out while launching the PDF renderer",
  );

  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (/^https?:/i.test(request.url())) {
        request.abort();
        return;
      }

      request.continue();
    });
    await withTimeout(
      page.setContent(htmlDocument, { waitUntil: "domcontentloaded", timeout: PDF_RENDER_TIMEOUT_MS }),
      PDF_RENDER_TIMEOUT_MS,
      "Timed out while rendering HTML for PDF",
    );
    await page.emulateMediaType("screen");
    await withTimeout(
      page.pdf({
        path: outputPath,
        printBackground: true,
        format: "A4",
        preferCSSPageSize: true,
      }),
      PDF_RENDER_TIMEOUT_MS,
      "Timed out while generating the PDF",
    );
  } finally {
    await browser.close();
  }
}

async function convertWithTextUtil(
  fileType: Exclude<FileType, "pdf">,
  htmlDocument: string,
  outputPath: string,
): Promise<void> {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "markup-to-docs-"));
  const htmlPath = path.join(temporaryDirectory, "document.html");

  try {
    await writeFile(htmlPath, htmlDocument, "utf8");
    await execFileAsync("textutil", ["-convert", fileType, htmlPath, "-output", outputPath], {
      timeout: TEXTUTIL_CONVERT_TIMEOUT_MS,
      killSignal: "SIGKILL",
    });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function buildTimestampString(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function expandHomeDirectory(directoryPath: string): string {
  if (directoryPath === "~") {
    return homedir();
  }

  if (directoryPath.startsWith("~/")) {
    return path.join(homedir(), directoryPath.slice(2));
  }

  return directoryPath;
}

function removeFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function sanitizeFileName(fileName: string): string {
  const sanitized = stripControlCharacters(fileName)
    .replace(INVALID_FILENAME_CHARACTERS, "-")
    .replace(/\s+/g, " ")
    .trim();
  const trimmed = sanitized.slice(0, 90);
  return trimmed || `document-${buildTimestampString()}`;
}

function stripControlCharacters(value: string): string {
  return [...value].filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join("");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
