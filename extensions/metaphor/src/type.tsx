export interface Preferences {
  MetaphorAPIKey: string;
}

export interface Result {
  title: string; // The title of the search result.
  url: string; // The URL of the search result.
  publishedDate?: string; // The estimated creation date of the content. Format is YYYY-MM-DD. Nullable
  author?: string; // The author of the content, if available. Nullable
  score?: number; // A number from 0 to 1 representing similarity between the query/url and the result.
  id: string; // The temporary ID for the document. Useful for /contents endpoint.
}
