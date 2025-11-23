/**
 * Preference definitions used across commands.
 * Currently limited to the fields required by the initial implementation.
 */
export type ImgBedPreferences = {
  apiBaseUrl: string;
  apiToken: string;
  defaultDir?: string;
  defaultChannel?: string;
  pageSize?: number;
  uploadChannel?: string;
  uploadFolder?: string;
  uploadNameType?: "default" | "index" | "origin" | "short";
  returnFormat?: "default" | "full";
  serverCompress?: boolean;
  autoRetry?: boolean;
};
