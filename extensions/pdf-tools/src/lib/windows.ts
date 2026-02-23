import fs from "fs/promises";
import path from "path";
import { PDF } from "@libpdf/core";

/**
 * For Windows, MacOS uses native Swift implementation.
 * Splits a PDF document into multiple smaller PDF documents, with each chunk containing a specified number of pages.
 */
export async function splitByPageCountWindows(pdf: PDF, pagesPerChunk: number): Promise<PDF[]> {
  const chunks: PDF[] = [];
  for (let i = 0; i < pdf.getPageCount(); i += pagesPerChunk) {
    const indices = [];
    for (let j = i; j < Math.min(i + pagesPerChunk, pdf.getPageCount()); j++) {
      indices.push(j);
    }
    chunks.push(await pdf.extractPages(indices));
  }
  return chunks;
}

/**
 * Props for splitting by size on Windows
 */
type SplitBySizePropsWindows = {
  pdf: PDF;
  maxSizeBytes: number;
  originalFileName: string;
  dirPath: string;
  suffix: string;
};
/**
 * For Windows, MacOS uses native Swift implementation.
 * Splits a PDF document by file size, creating chunks that don't exceed the specified size limit.
 */
export async function splitBySizeWindows(props: SplitBySizePropsWindows): Promise<void> {
  const { pdf, maxSizeBytes, originalFileName, dirPath, suffix } = props;
  const totalPages = pdf.getPageCount();
  let currentPart = 1;
  let startPage = 0;

  while (startPage < totalPages) {
    let endPage = startPage;
    let currentChunkBytes: Uint8Array | null = null;

    // Greedily add pages until we exceed the size limit
    while (endPage < totalPages) {
      const indices: number[] = [];
      for (let i = startPage; i <= endPage; i++) {
        indices.push(i);
      }

      const chunkPdf = await pdf.extractPages(indices);
      const testBytes = await chunkPdf.save();

      if (testBytes.length > maxSizeBytes) {
        // If this is the first page and it already exceeds the limit,
        // we must include it anyway (single page exceeds max size)
        if (endPage === startPage) {
          currentChunkBytes = testBytes;
          endPage++;
        }
        break;
      }

      currentChunkBytes = testBytes;
      endPage++;
    }

    // Save the current chunk
    if (currentChunkBytes) {
      const chunkFilePath = path.join(dirPath, `${originalFileName} [${suffix} ${currentPart}].pdf`);
      await fs.writeFile(chunkFilePath, currentChunkBytes);
      currentPart++;
    }

    startPage = endPage;
  }
}
