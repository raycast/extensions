export type BucketProfile = {
  /**
   * Human-friendly profile name (used in UI and as the selector in preferences)
   */
  name: string;

  /**
   * R2 bucket name
   */
  bucket: string;

  /**
   * Preferred: single template that yields the full object key.
   * Example: "uploads/{yyyy}/{mm}/{dd}/{uuid}.{ext}"
   */
  keyTemplate?: string;

  /**
   * Alternative: build key from pathPrefix + filenameTemplate
   */
  pathPrefix?: string;
  filenameTemplate?: string;

  /**
   * Optional override for public URL base.
   * Example: "https://cdn.example.com" or "https://pub-xxxx.r2.dev"
   */
  publicBaseUrl?: string;
};

export type Preferences = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  customDomain?: string;
  customDomains?: string;
  bucketNames?: string;
  defaultFolderTemplate?: string;
  defaultFilenameTemplate?: string;
  defaultProfile?: string;
  autoCopyUrl?: boolean;
  bucketProfilesJson?: string;
};
