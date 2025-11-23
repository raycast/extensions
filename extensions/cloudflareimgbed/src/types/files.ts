export type ImgBedFileMetadata = {
  channel: "telegram" | "cfr2" | "s3" | string;
  timestamp: Date;
  size: number;
  mime: string;
  tags?: string[];
};

export type ImgBedFileItem = {
  name: string;
  url: string;
  metadata: ImgBedFileMetadata;
};

export type ImgBedListResponse = {
  files: Array<{
    name: string;
    metadata: Record<string, string>;
  }>;
  directories: string[];
  totalCount?: number;
  returnedCount?: number;
  indexLastUpdated?: string;
  isIndexedResponse?: boolean;
};
