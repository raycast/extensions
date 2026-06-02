import { Image } from "@raycast/api";

export const HISTORY_KEY = "history";

export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  icon?: Image.ImageLike;

  isNavigation?: boolean;
  isHistory?: boolean;
}
