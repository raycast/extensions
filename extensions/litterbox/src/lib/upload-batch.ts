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

export async function uploadFilesBatch(
  filePaths: string[],
  expiry: ExpiryTime,
  dependencies: UploadBatchDependencies,
): Promise<UploadBatchResult> {
  const uploads: UploadedFile[] = [];

  for (const filePath of filePaths) {
    const url = await dependencies.uploadFile(filePath, expiry);
    const filename = path.basename(filePath);

    uploads.push({ filename, url });

    await dependencies.addRecentUpload({
      url,
      time: expiry,
      uploadedAt: dependencies.now?.() ?? Date.now(),
      filename,
    });
  }

  await dependencies.copyToClipboard(uploads.map((upload) => upload.url).join("\n"));

  return { uploads };
}
