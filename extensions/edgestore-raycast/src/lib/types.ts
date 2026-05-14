export type BucketConfig = {
  bucketRefId: string; // Random internal id used only inside Raycast
  accessKey: string;
  secretKey: string;
  bucketName: string;
  temporaryFiles?: boolean;
};

export type StoredState = {
  bucketsByRefId: Record<string, BucketConfig>;
  lastUsedBucketRefId?: string;
};

export type UploadResult = {
  success: boolean;
  uploadedCount: number;
  bucketRefId: string;
  urls: string[];
};
