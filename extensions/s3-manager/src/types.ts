export interface S3Extension {
  commands: S3Command[];
  profiles: ConnectionProfile[];
  cache: S3Cache;
  api: BunS3Client;
}

export interface S3Command {
  name: string;
  mode: "view" | "no-view";
  component: React.ComponentType;
  preferences?: Preference[];
}

export interface ConnectionProfile {
  id: string;
  name: string;
  provider: "aws" | "r2" | "spaces" | "custom";
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  defaultBucket?: string;
  isDefault: boolean;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  isFolder: boolean;
  etag?: string;
}

export interface S3Bucket {
  name: string;
  creationDate: Date;
  region: string;
  objectCount?: number;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  actions: Array<{ title: string; action: string }>;
}

export interface S3Cache {
  cacheBucketListing(profileId: string, bucket: string, objects: S3Object[]): Promise<void>;
  getCachedBucketListing(profileId: string, bucket: string): Promise<S3Object[] | null>;
}

export type BunS3Client = Record<string, unknown>;

export interface Preference {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  description?: string;
}

export type S3Operation =
  | "list-buckets"
  | "list-objects"
  | "upload-file"
  | "download-file"
  | "delete-object"
  | "create-bucket";

export interface ExtensionAnalytics {
  trackUserAction(action: string, properties?: Record<string, unknown>): void;
  trackOperationSuccess(operation: S3Operation, duration: number): void;
  trackOperationFailure(operation: S3Operation, error: string): void;
  trackResponseTime(operation: string, duration: number): void;
  trackCachePerformance(hitRate: number, operation: string): void;
  trackFeatureUsage(feature: string, userSegment?: string): void;
  trackProfileConfiguration(profileCount: number): void;
}
