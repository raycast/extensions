// Shared domain types and DigUp's constants (DigUp: Model.swift, IndexStore.swift, LlamaEmbedder.swift).
// Every engine module and the Raycast commands import from here; change it only on purpose.

export type FileKind = "screenshot" | "image" | "pdf" | "doc" | "audio" | "video" | "code";
export const FILE_KINDS: readonly FileKind[] = ["screenshot", "image", "pdf", "doc", "audio", "video", "code"];

export type FileState = "pending" | "done" | "partial" | "skipped" | "failed";

export type SegmentKind =
  "name" | "image" | "ocr" | "page" | "page_image" | "chunk" | "audio" | "frame" | "lines" | "cells";

export type Modality = "none" | "text" | "image" | "audio";
export const MODALITIES: readonly Modality[] = ["none", "text", "image", "audio"];

/** First-pass order: screenshots, images, PDFs, docs, audio, video, code; newest first inside a kind. */
export const INDEXING_ORDER_SQL =
  "CASE kind WHEN 'screenshot' THEN 0 WHEN 'image' THEN 1 WHEN 'pdf' THEN 2 WHEN 'doc' THEN 3 " +
  "WHEN 'audio' THEN 4 WHEN 'video' THEN 5 ELSE 6 END";

/** DigUp: IndexOptions (Model.swift:36-86). */
export interface IndexOptions {
  code: boolean;
  includeCode: boolean;
  includeDatasets: boolean;
  excludedFolders: string[];
  excludedExtensions: string[];
  minImageSide: number;
  bigPDFPages: number;
  pdfStep: number;
  docStep: number;
  maxPages: number;
  maxChunks: number;
  minPageText: number;
  photoBudget: number;
  screenshotBudget: number;
  pageBudget: number;
  frameBudget: number;
  frameInterval: number;
  audioWindow: number;
  audioHop: number;
  codeStretch: number;
  maxCodeBytes: number;
  maxNotebookBytes: number;
}

export const DEFAULT_OPTIONS: IndexOptions = {
  code: false,
  includeCode: false,
  includeDatasets: false,
  excludedFolders: [],
  excludedExtensions: [],
  minImageSide: 256,
  bigPDFPages: 50,
  pdfStep: 30,
  docStep: 40,
  maxPages: 5000,
  maxChunks: 5000,
  minPageText: 200,
  photoBudget: 140,
  screenshotBudget: 280,
  pageBudget: 280,
  frameBudget: 70,
  frameInterval: 3.0,
  audioWindow: 30.0,
  audioHop: 25.0,
  codeStretch: 1800,
  maxCodeBytes: 1 << 20,
  maxNotebookBytes: 20 << 20,
};

/** Swift prints Doubles with a ".0": keep DigUp's fingerprint text byte for byte. */
function swiftDouble(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

/** DigUp: IndexOptions.fingerprint (Model.swift:80-85). */
export function optionsFingerprint(options: IndexOptions): string {
  if (options.code) return `code1 lines${options.codeStretch}`;
  return (
    `photo${options.photoBudget} shot${options.screenshotBudget} page${options.pageBudget} ` +
    `frame${options.frameBudget}/${swiftDouble(options.frameInterval)}s ` +
    `audio${swiftDouble(options.audioWindow)}/${swiftDouble(options.audioHop)}s`
  );
}

/** DigUp: Worker.vectorSource with LlamaEmbedder.modelInfo. The pipeline here reproduces those vectors. */
export const VECTOR_SOURCE = "google/embeddinggemma-2@bfcd298 llama.cpp-vectors1 text-q8_0+mmproj-q8_0";
export const DIMENSION = 768;
export const IMAGE_BUDGETS = [70, 140, 280, 560, 1120] as const;

/** DigUp: Prompts (Model.swift:88-100). Media inputs take no prompt. */
export const Prompts = {
  query: (text: string) => `task: search result | query: ${text}`,
  codeQuery: (text: string) => `task: code retrieval | query: ${text}`,
  document: (title: string | null | undefined, text: string) => `title: ${title ? title : "none"} | text: ${text}`,
};

/** DigUp: CodeQuery (Model.swift:104-113). The text after "code:" ("" for "code:" alone), or null. */
export function codeQueryText(query: string): string | null {
  const trimmed = query.replace(/^\s+/u, "");
  if (trimmed.length < 5 || trimmed.slice(0, 5).toLowerCase() !== "code:") return null;
  return trimmed.slice(5).trim();
}

/** A file row (table `files`). `info` values are all strings, as DigUp writes them. */
export interface FileRow {
  id: number;
  path: string;
  kind: FileKind;
  size: number;
  mtime: number;
  inode: number;
  device: number;
  state: FileState;
  detail: string | null;
  info: Record<string, string>;
  indexedAt: number | null;
}

/** One search result: DigUp's SearchHit (Searcher.swift:3-24). One hit per file. */
export interface Hit {
  path: string;
  kind: FileKind;
  score: number;
  z: number | null;
  cosine: number | null;
  keywordRank: number | null;
  segment: SegmentKind;
  segmentId: number;
  /** Search session and file indexing version, for preview cache invalidation. */
  previewVersion?: string;
  /** PDF page (1-based), start second (audio/video), chunk number (1-based), or first line/cell of code. */
  loc: number | null;
  /** End second, or last line/cell. */
  locEnd: number | null;
  /** Matched words wrapped in «», or the stored excerpt. */
  excerpt: string | null;
  /** File mtime, seconds since 1970. */
  modified: number;
  size: number;
  info: Record<string, string>;
  /** Code only: the line to open at. */
  focus: number | null;
}

/** DigUp: Searcher.strongCount (ratio 0.5): leading hits that score at least half the top score. */
export function strongCount(scores: number[], ratio = 0.5): number {
  if (scores.length === 0) return 0;
  const top = scores[0];
  if (top <= 0) return scores.length;
  let n = 0;
  while (n < scores.length && scores[n] >= top * ratio) n++;
  return n;
}
