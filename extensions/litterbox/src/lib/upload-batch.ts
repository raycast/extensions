import * as path from "path";
import type { ExpiryTime } from "./api";
import type { StoredUpload } from "./storage";

type UploadFileFn = (filePath: string, expiry: ExpiryTime) => Promise<string>;
type AddRecentUploadFn = (upload: StoredUpload) => Promise<void>;
type CopyToClipboardFn = (text: string) => Promise<void>;

export interface UploadBatchDependencies {
  uploadFile: UploadFileFn;
  addRecentUpload: AddRecentUploadFn;
  copyToClipboard: CopyToClipboardFn;
  now?: () => number;
}

export interface UploadedFile {
  filename: string;
  url: string;
}

export interface UploadBatchResult {
  uploads: UploadedFile[];
}

interface UploadBatchErrorOptions {
  message: string;
  uploads: UploadedFile[];
  totalFiles: number;
  clipboardCopied: boolean;
  failedFilename?: string;
  clipboardErrorMessage?: string;
}

export class UploadBatchError extends Error {
  uploads: UploadedFile[];
  totalFiles: number;
  clipboardCopied: boolean;
  failedFilename?: string;
  clipboardErrorMessage?: string;

  constructor(options: UploadBatchErrorOptions) {
    super(options.message);
    this.name = "UploadBatchError";
    this.uploads = options.uploads;
    this.totalFiles = options.totalFiles;
    this.clipboardCopied = options.clipboardCopied;
    this.failedFilename = options.failedFilename;
    this.clipboardErrorMessage = options.clipboardErrorMessage;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Upload failed";
}

async function copyUploadedUrls(uploads: UploadedFile[], copyToClipboard: CopyToClipboardFn): Promise<void> {
  await copyToClipboard(uploads.map((upload) => upload.url).join("\n"));
}

async function persistUploads(
  uploads: UploadedFile[],
  expiry: ExpiryTime,
  dependencies: UploadBatchDependencies,
): Promise<void> {
  const uploadedAt = dependencies.now?.() ?? Date.now();

  for (const upload of uploads) {
    await dependencies.addRecentUpload({
      url: upload.url,
      time: expiry,
      uploadedAt,
      filename: upload.filename,
    });
  }
}

export async function uploadFilesBatch(
  filePaths: string[],
  expiry: ExpiryTime,
  dependencies: UploadBatchDependencies,
): Promise<UploadBatchResult> {
  const uploads: UploadedFile[] = [];

  for (const filePath of filePaths) {
    try {
      const url = await dependencies.uploadFile(filePath, expiry);
      const filename = path.basename(filePath);

      uploads.push({ filename, url });
    } catch (error) {
      let clipboardCopied = false;
      let clipboardErrorMessage: string | undefined;

      if (uploads.length > 0) {
        try {
          await copyUploadedUrls(uploads, dependencies.copyToClipboard);
          clipboardCopied = true;
          await persistUploads(uploads, expiry, dependencies);
        } catch (clipboardError) {
          clipboardErrorMessage = getErrorMessage(clipboardError);
        }
      }

      throw new UploadBatchError({
        message: getErrorMessage(error),
        uploads,
        totalFiles: filePaths.length,
        clipboardCopied,
        failedFilename: path.basename(filePath),
        clipboardErrorMessage,
      });
    }
  }

  try {
    await copyUploadedUrls(uploads, dependencies.copyToClipboard);
  } catch (error) {
    throw new UploadBatchError({
      message: getErrorMessage(error),
      uploads,
      totalFiles: uploads.length,
      clipboardCopied: false,
      clipboardErrorMessage: getErrorMessage(error),
    });
  }

  await persistUploads(uploads, expiry, dependencies);

  return { uploads };
}
