export type OutputFormat = "url" | "markdown" | "html" | "custom";

export type Status = {
  app: string;
  version: string;
  build: string;
  apiVersion: number;
  defaultDestinationId: string | null;
  outputFormat: OutputFormat;
  /** Missing before Aktar added watched folders. */
  watching?: { paused: boolean; folders: number };
};

export type Destination = {
  id: string;
  name: string;
  /** Aktar's preset ID, e.g. "cloudflareR2" or "amazonS3". */
  provider: string;
  providerName: string;
  bucket: string;
  publicBaseURL: string;
  isDefault: boolean;
};

export type Upload = {
  id: string;
  filename: string;
  objectKey: string;
  url: string;
  destinationId: string;
  destinationName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  /** When Aktar's lifecycle rule deletes the file. Null keeps it forever; missing before Aktar 0.5.0. */
  expiresAt?: string | null;
  formats: Record<OutputFormat, string>;
  /**
   * Only on an upload reply: true when nothing was uploaded because the same
   * file was already in that destination, and Aktar reused its existing link.
   */
  reused?: boolean;
};

export type BucketFolder = {
  prefix: string;
  name: string;
};

export type BucketObject = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
  /** Missing when the destination has no public base URL. */
  url: string | null;
};

export type BucketListing = {
  prefix: string;
  folders: BucketFolder[];
  objects: BucketObject[];
  nextContinuationToken: string | null;
};

export type TemporaryLink = {
  url: string;
  expiresAt: string;
};

export type WatchedFolderStatus = "watching" | "paused" | "disabled" | "accessNeeded" | "notFound" | "error";

export type WatchedFolder = {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  status: WatchedFolderStatus;
  /** Null uploads to the default destination. */
  destinationID: string | null;
  /** Files waiting for their write to finish. */
  waiting: number;
  uploading: number;
  failed: number;
  /** Files held until the user confirms a large batch in Aktar. */
  awaitingConfirmation: number;
  lastUploadAt: string | null;
};

export type WatchedFolders = {
  paused: boolean;
  /** An ISO-8601 date, or null when paused until resumed (or not paused). */
  pausedUntil: string | null;
  folders: WatchedFolder[];
};
