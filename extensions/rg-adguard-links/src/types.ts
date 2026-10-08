export interface DownloadLink {
  fileName: string;
  url: string;
  size?: string;
  type?: string;
}

export interface AppMetadata {
  productId: string;
  name?: string;
  version?: string;
  publisher?: string;
}

export interface FetchResult {
  links: DownloadLink[];
  metadata: AppMetadata;
}
