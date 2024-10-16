export interface Link {
  id: string;
  url: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  comment?: string;
}

export interface Preferences {
  host: string;
  token: string;
  showWebsitePreview: string;
  language: string;
}

export interface Config {
  host: string;
  token: string;
  showWebsitePreview: string;
  language: string;
}

export interface CreateLinkResponse {
  link: Link;
}
