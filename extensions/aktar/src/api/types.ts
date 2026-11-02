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
  /** When the file was last replaced in place (its link stayed); missing or null when it never was. */
  replacedAt?: string | null;
  /** Copy formats; when the upload has a short link, they use it. */
  formats: Record<OutputFormat, string>;
  /** The active short link from the destination's link shortener, or null. */
  shortUrl?: string | null;
  /** Only on an upload reply whose short link couldn't be made: why. The upload itself succeeded. */
  shortLinkError?: string;
  /**
   * Only on an upload reply: true when nothing was uploaded because the same
   * file was already in that destination, and Aktar reused its existing link.
   */
  reused?: boolean;
};

/** An upload's active short link is "active"; "unknown" means updating where it points failed. */
export type ShortLinkStatus = "active" | "expired" | "deleted" | "orphaned" | "unknown";

export type ShortLink = {
  id: string;
  shortUrl: string;
  targetUrl: string;
  /** The shortener's ID, e.g. "shlink" or "dub". */
  provider: string;
  providerName: string;
  status: ShortLinkStatus;
  createdAt: string;
  expiresAt: string | null;
  /** Null when the shortener doesn't report clicks. */
  clicks: number | null;
  lastClickAt: string | null;
};

/**
 * What a move or rename did to the file's short links: "updated" points them
 * at the new key, "orphaned" left them pointing at the old one, and
 * "notUpdated" kept the old file so they still work.
 */
export type ShortLinkMoveStatus = "none" | "updated" | "orphaned" | "notUpdated";

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
