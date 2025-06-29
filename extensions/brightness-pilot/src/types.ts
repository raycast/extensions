export interface Monitor {
  id: number;
  name: string;
  brightness: number;
  isBuiltIn: boolean;
  isSupported: boolean;
}

export interface Release {
  assets: Array<{
    name: string;
    digest: string;
    browser_download_url: string;
  }>;
}