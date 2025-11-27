export type UploadStatus = "pending" | "uploading" | "processing" | "indexed" | "error";

export interface StoredDocument {
  id: string;
  name: string;
  uploadDate: string;
  size: number;
  status: UploadStatus;
  metadata?: Record<string, string>;
}

export interface CacheState {
  fileSearchStoreId?: string;
  documents: StoredDocument[];
}
