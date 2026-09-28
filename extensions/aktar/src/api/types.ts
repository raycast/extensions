export type OutputFormat = "url" | "markdown" | "html" | "custom";

export type Status = {
  app: string;
  version: string;
  build: string;
  apiVersion: number;
  defaultDestinationId: string | null;
  outputFormat: OutputFormat;
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
  formats: Record<OutputFormat, string>;
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
