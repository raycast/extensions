import { readFile } from "node:fs/promises";

export type PdfSource =
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | {
      arrayBuffer: () => Promise<ArrayBuffer>;
    };

export type MergePdfSource = {
  data: PdfSource;
  pageRange?: string;
};

const parsePageRange = (range: string, totalPages: number): number[] => {
  if (!range.trim()) {
    return [];
  }

  const indices = new Set<number>();

  for (const segment of range.split(",")) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) {
      continue;
    }

    const [startRaw, endRaw] = trimmedSegment
      .split("-")
      .map((part) => part.trim());
    const start = Number.parseInt(startRaw, 10);
    const end = endRaw ? Number.parseInt(endRaw, 10) : Number.NaN;

    if (Number.isNaN(start)) {
      continue;
    }

    if (Number.isNaN(end)) {
      if (start >= 1 && start <= totalPages) {
        indices.add(start - 1);
      }
      continue;
    }

    const lowerBound = Math.max(1, Math.min(start, end));
    const upperBound = Math.min(totalPages, Math.max(start, end));

    for (let page = lowerBound; page <= upperBound; page += 1) {
      indices.add(page - 1);
    }
  }

  return Array.from(indices).sort((left, right) => left - right);
};

const getAllPageIndices = (totalPages: number): number[] =>
  Array.from({ length: totalPages }, (_unused, index) => index);

const isBlob = (value: unknown): value is Blob =>
  typeof Blob !== "undefined" && value instanceof Blob;

const hasArrayBuffer = (
  value: unknown,
): value is { arrayBuffer: () => Promise<ArrayBuffer> } =>
  Boolean(
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function",
  );

const toArrayBuffer = async (source: PdfSource): Promise<ArrayBuffer> => {
  if (source instanceof ArrayBuffer) {
    return source;
  }

  if (ArrayBuffer.isView(source)) {
    const view = new Uint8Array(
      source.buffer,
      source.byteOffset,
      source.byteLength,
    );
    return view.slice().buffer;
  }

  if (isBlob(source) || hasArrayBuffer(source)) {
    return source.arrayBuffer();
  }

  throw new TypeError("Unsupported PDF source type.");
};

type PdfLibModule = typeof import("pdf-lib");

let pdfLibModulePromise: Promise<PdfLibModule> | undefined;

const loadPdfLib = async (): Promise<PdfLibModule> => {
  if (!pdfLibModulePromise) {
    pdfLibModulePromise = import("pdf-lib");
  }

  return pdfLibModulePromise;
};

export const mergePdfs = async (
  inputs: MergePdfSource[],
): Promise<Uint8Array> => {
  if (inputs.length === 0) {
    throw new Error("At least one PDF source is required.");
  }

  const { PDFDocument } = await loadPdfLib();
  const mergedDocument = await PDFDocument.create();

  for (const input of inputs) {
    const bytes = await toArrayBuffer(input.data);
    const sourceDocument = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
    });
    const selectedPageIndices = parsePageRange(
      input.pageRange ?? "",
      sourceDocument.getPageCount(),
    );
    const pageIndices = selectedPageIndices.length
      ? selectedPageIndices
      : getAllPageIndices(sourceDocument.getPageCount());
    const copiedPages = await mergedDocument.copyPages(
      sourceDocument,
      pageIndices,
    );

    for (const page of copiedPages) {
      mergedDocument.addPage(page);
    }
  }

  return mergedDocument.save();
};

export const mergePdfFiles = async (
  filePaths: string[],
): Promise<Uint8Array> => {
  const files = await Promise.all(
    filePaths.map(async (filePath) => ({
      data: await readFile(filePath),
    })),
  );

  return mergePdfs(files);
};
