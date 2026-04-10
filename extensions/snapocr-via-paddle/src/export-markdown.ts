import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, join, posix } from "node:path";
import type { OCRPage, OCRResult } from "./types";

export interface MarkdownBundleExport {
  bundlePath: string;
  markdownPath: string;
  imageCount: number;
  pageCount: number;
}

const EXPORTS_DIRECTORY = join(homedir(), "Downloads", "SnapOCR Exports");

function sanitizeFileName(value: string): string {
  return (
    value
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "document"
  );
}

function normalizeAssetPath(value: string, pageIndex: number, imageIndex: number): string {
  const normalized = value.replace(/\\/g, "/").trim();
  const segments = normalized
    .replace(/^\.?\//, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..");
  let safePath = segments.join("/");

  if (!safePath) {
    safePath = `images/page-${pageIndex + 1}-image-${imageIndex + 1}.png`;
  }

  if (!posix.extname(safePath)) {
    safePath = `${safePath}.png`;
  }

  return safePath;
}

function makeUniquePath(candidate: string, seen: Set<string>): string {
  let nextCandidate = candidate;
  const extension = posix.extname(candidate);
  const stem = extension ? candidate.slice(0, -extension.length) : candidate;
  let counter = 2;

  while (seen.has(nextCandidate)) {
    nextCandidate = `${stem}-${counter}${extension}`;
    counter += 1;
  }

  seen.add(nextCandidate);
  return nextCandidate;
}

function decodeBase64(value: string): Buffer {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  const base64 = (match?.[1] ?? value).replace(/\s+/g, "");
  return Buffer.from(base64, "base64");
}

function rewriteMarkdownAssetPaths(markdown: string, mapping: Map<string, string>): string {
  let nextMarkdown = markdown;

  for (const [originalPath, safePath] of mapping.entries()) {
    if (originalPath === safePath) {
      continue;
    }
    nextMarkdown = nextMarkdown.split(originalPath).join(safePath);
  }

  return nextMarkdown;
}

async function writePageImages(
  bundlePath: string,
  page: OCRPage,
  seenPaths: Set<string>,
): Promise<{ markdown: string; imageCount: number }> {
  const entries = Object.entries(page.images);
  if (entries.length === 0) {
    return { markdown: page.text, imageCount: 0 };
  }

  const pathMapping = new Map<string, string>();

  for (const [index, [imagePath]] of entries.entries()) {
    const safePath = makeUniquePath(normalizeAssetPath(imagePath, page.index, index), seenPaths);
    pathMapping.set(imagePath, safePath);
  }

  await Promise.all(
    entries.map(async ([imagePath, imageData]) => {
      const safePath = pathMapping.get(imagePath);
      if (!safePath) {
        return;
      }

      const outputPath = join(bundlePath, safePath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, decodeBase64(imageData));
    }),
  );

  return {
    markdown: rewriteMarkdownAssetPaths(page.text, pathMapping),
    imageCount: entries.length,
  };
}

function buildExportFolderName(sourcePath: string): string {
  const name = sanitizeFileName(basename(sourcePath, extname(sourcePath)));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${name}-${timestamp}`;
}

export async function exportMarkdownBundle(result: OCRResult, sourcePath: string): Promise<MarkdownBundleExport> {
  const bundlePath = join(EXPORTS_DIRECTORY, buildExportFolderName(sourcePath));
  await mkdir(bundlePath, { recursive: true });

  let imageCount = 0;
  const markdownParts: string[] = [];
  const seenPaths = new Set<string>();

  for (const page of result.pages) {
    const pageExport = await writePageImages(bundlePath, page, seenPaths);
    imageCount += pageExport.imageCount;
    if (pageExport.markdown) {
      markdownParts.push(pageExport.markdown);
    }
  }

  const markdownPath = join(bundlePath, "document.md");
  await writeFile(markdownPath, markdownParts.join("\n\n"), "utf8");

  return {
    bundlePath,
    markdownPath,
    imageCount,
    pageCount: result.pages.length,
  };
}
