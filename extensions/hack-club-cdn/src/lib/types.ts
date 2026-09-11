export interface UploadRecord {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: string;
  sourceType: "file" | "url";
  /** Natural pixel width, when known (image uploads from a local file with a recognized format). */
  width?: number;
  /** Natural pixel height, when known (image uploads from a local file with a recognized format). */
  height?: number;
}

export class CdnApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CdnApiError";
    this.status = status;
  }
}

export type ClipboardResolution =
  | { type: "file"; path: string; needsConfirm: false }
  | { type: "path-text"; path: string; needsConfirm: true }
  | { type: "url"; url: string; needsConfirm: true }
  | { type: "already-cdn-link" }
  | { type: "none" };
