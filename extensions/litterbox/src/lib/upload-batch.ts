import * as path from "path";
import type { ExpiryTime } from "./api";
import type { StoredUpload } from "./storage";
import { validateUploadFiles } from "./validation";

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
  historyErrorMessage?: string;
}

export class UploadBatchError extends Error {
  uploads: UploadedFile[];
  totalFiles: number;
  clipboardCopied: boolean;
  failedFilename?: string;
  clipboardErrorMessage?: string;
  historyErrorMessage?: string;

  constructor(options: UploadBatchErrorOptions) {
    super(options.message);
    this.name = "UploadBatchError";
    this.uploads = options.uploads;
    this.totalFiles = options.totalFiles;
    this.clipboardCopied = options.clipboardCopied;
    this.failedFilename = options.failedFilename;
    this.clipboardErrorMessage = options.clipboardErrorMessage;
    this.historyErrorMessage = options.historyErrorMessage;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : "Upload failed";
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
  await validateUploadFiles(filePaths);
  const uploads: UploadedFile[] = [];
  let uploadError: string | undefined;
  let failedFilename: string | undefined;

  for (const filePath of filePaths) {
    try {
      const url = await dependencies.uploadFile(filePath, expiry);
      uploads.push({ filename: path.basename(filePath), url });
    } catch (error) {
      uploadError = getErrorMessage(error);
      failedFilename = path.basename(filePath);
      break;
    }
  }

  let historyErrorMessage: string | undefined;
  let clipboardErrorMessage: string | undefined;
  let clipboardCopied = false;
  if (uploads.length > 0) {
    // Keep successful links even when the clipboard is unavailable, and still
    // attempt the clipboard if local history fails.
    try {
      await persistUploads(uploads, expiry, dependencies);
    } catch (error) {
      historyErrorMessage = getErrorMessage(error);
    }
    try {
      await copyUploadedUrls(uploads, dependencies.copyToClipboard);
      clipboardCopied = true;
    } catch (error) {
      clipboardErrorMessage = getErrorMessage(error);
    }
  }

  if (uploadError !== undefined || historyErrorMessage !== undefined || clipboardErrorMessage !== undefined) {
    throw new UploadBatchError({
      message: uploadError ?? historyErrorMessage ?? clipboardErrorMessage ?? "Upload failed",
      uploads,
      totalFiles: filePaths.length,
      clipboardCopied,
      failedFilename,
      clipboardErrorMessage,
      historyErrorMessage,
    });
  }

  return { uploads };
}
