import type { ImgBedFileItem } from "../types/files";

export type UploadOptions = {
  filePath: string;
  fileName?: string;
  channel?: string;
  folder?: string;
  nameType?: "default" | "index" | "origin" | "short";
  returnFormat?: "default" | "full";
  serverCompress?: boolean;
  autoRetry?: boolean;
};

export type ListQuery = {
  dir?: string;
  search?: string;
  includeTags?: string;
  excludeTags?: string;
  channel?: string;
  listType?: string;
  start?: number;
  count?: number;
  recursive?: boolean;
};

export type TagUpdateAction = "set" | "add" | "remove";

export type TagUpdatePayload = {
  action: TagUpdateAction;
  tags: string[];
};

export interface ImgBedClient {
  uploadImage(options: UploadOptions): Promise<string>;
  listFiles(query: ListQuery): Promise<ImgBedFileItem[]>;
  deleteFile(path: string, opts?: { folder?: boolean }): Promise<void>;
  getTags(fileId: string): Promise<string[]>;
  updateTags(fileId: string, payload: TagUpdatePayload): Promise<string[]>;
}
