export type NullableString = string | null | undefined;

export interface UrlDetail {
  id: string;
  url: string;
  title: string;
  lastVisited: Date;
}

export interface UrlSearchResult {
  entries?: UrlDetail[];
  error?: string;
  isLoading: boolean;
}
