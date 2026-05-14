export type FontFormat = "woff2" | "woff" | "ttf" | "otf" | "eot" | "unknown";

export interface FontInfo {
  family: string;
  url: string;
  format: FontFormat;
  weight?: string;
  style?: string;
  size?: number;
  accessible: boolean;
  isDataUri: boolean;
  dataUriContent?: string;
}

export interface DownloadResult {
  font: FontInfo;
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ExtractedCSS {
  content: string;
  baseUrl: string;
}
