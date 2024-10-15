export interface Link {
  id: string;
  url: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  comment?: string;
}

export interface Preferences {
  language: "en" | "zh";
  showWebsitePreview: boolean;
}

export interface Config {
  host: string;
  token: string;
  showWebsitePreview: string;
  language: string;
}
