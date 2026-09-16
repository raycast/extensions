import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";

import type { BookFormat } from "../domain/book";
import { importEpub } from "./epub";
import { importMarkdown } from "./markdown";
import { importPdf } from "./pdf";
import { importPlainText } from "./plain-text";
import { ImportError, type ImportedBook, type Importer } from "./types";

export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

const FORMAT_BY_EXTENSION: Readonly<Record<string, BookFormat>> = {
  ".md": "md",
  ".markdown": "md",
  ".txt": "txt",
  ".epub": "epub",
  ".pdf": "pdf",
};

const IMPORTERS: Readonly<Record<BookFormat, Importer>> = {
  md: importMarkdown,
  txt: importPlainText,
  epub: importEpub,
  pdf: importPdf,
};

export const SUPPORTED_EXTENSIONS = Object.keys(FORMAT_BY_EXTENSION);

export interface ImportResult {
  format: BookFormat;
  fileName: string;
  book: ImportedBook;
}

export function detectFormat(filePath: string): BookFormat | null {
  return FORMAT_BY_EXTENSION[extname(filePath).toLowerCase()] ?? null;
}

export async function importFile(filePath: string): Promise<ImportResult> {
  const format = detectFormat(filePath);
  if (!format) {
    throw new ImportError(`Unsupported file type. Use ${SUPPORTED_EXTENSIONS.join(", ")}.`);
  }

  let data: Buffer;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new ImportError("Select a file, not a folder.");
    }
    if (info.size > MAX_IMPORT_BYTES) {
      throw new ImportError(`The file is larger than ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`);
    }
    data = await readFile(filePath);
  } catch (error) {
    if (error instanceof ImportError) {
      throw error;
    }
    throw new ImportError("Could not read the selected file.", { cause: error });
  }

  const book = await IMPORTERS[format](data, basename(filePath, extname(filePath)));
  return { format, fileName: basename(filePath), book };
}
