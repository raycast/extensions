export interface Link {
  id: string;
  url: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  comment?: string;
}

export type Config = Preferences;

export interface CreateLinkResponse {
  link: Link;
}
