import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import type { UploadToFileSearchStoreOperation as UploadOperation } from "@google/genai";
import { ensureFileSearchStore, uploadFileToStore, waitForUploadCompletion } from "./file-search";
import { upsertDocuments } from "./cache";
import type { StoredDocument } from "./types";

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export type UploadableFile = {
  path: string;
  name: string;
  size: number;
  mimeType: string;
};

export interface UploadOptions {
  onProgressUpdate?: (file: UploadableFile, index: number, total: number) => void;
  onOperationTick?: (file: UploadableFile, operation: UploadOperation) => void;
}

interface UploadResult {
  store: {
    id: string;
    name: string;
    displayName?: string;
  };
  documents: StoredDocument[];
}

export async function readFilesMetadata(paths: string[]): Promise<UploadableFile[]> {
  const metadata: UploadableFile[] = [];

  for (const path of paths) {
    try {
      const stats = await stat(path);
      if (!stats.isFile()) {
        continue;
      }

      const filename = path.split("/").pop() || "";
      const mimeType = mimeLookup(filename) || undefined;
      console.log(`File: ${filename}, MIME Type: ${mimeType || "unknown"}`);
      if (mimeType === undefined) {
        throw new Error(`Unable to determine MIME type for file: ${filename}`);
      }

      metadata.push({
        path,
        name: basename(path),
        size: stats.size,
        mimeType: mimeType || "text/plain",
      });
    } catch (error) {
      console.warn("Unable to read file metadata", path, error);
    }
  }

  return metadata;
}

export function findOversizedFile(
  files: UploadableFile[],
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES,
): UploadableFile | undefined {
  return files.find((file) => file.size > maxSizeBytes);
}

export async function uploadFilesToLibrary(
  files: UploadableFile[],
  options: UploadOptions = {},
): Promise<UploadResult> {
  if (files.length === 0) {
    throw new Error("Provide at least one file to upload.");
  }

  const store = await ensureFileSearchStore();
  console.log("[Upload] Using file search store", {
    storeId: store.id,
    storeName: store.name,
    storeDisplayName: store.displayName ?? "(no display name)",
  });

  const uploadedDocs: StoredDocument[] = [];
  const total = files.length;

  for (let index = 0; index < total; index += 1) {
    const file = files[index];
    options.onProgressUpdate?.(file, index, total);

    const operation = await uploadFileToStore({
      fileSearchStoreName: store.name,
      file: file.path,
      config: {
        displayName: file.name,
        mimeType: file.mimeType,
      },
    });

    const completedOperation = await waitForUploadCompletion(operation, (op) => options.onOperationTick?.(file, op));

    const documentId = parseDocumentId(completedOperation.response?.documentName ?? completedOperation.name ?? "");

    uploadedDocs.push({
      id: documentId,
      name: file.name,
      uploadDate: new Date().toISOString(),
      size: file.size,
      status: "indexed",
    });
  }

  await upsertDocuments(uploadedDocs);

  return {
    store,
    documents: uploadedDocs,
  };
}

export function parseDocumentId(documentName: string): string {
  return documentName.split("/").pop() ?? documentName;
}
