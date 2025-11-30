export interface AddBookmarkSchema {
  url: string;
  title: string;
  description?: string;
  tags: string[];
  favicon?: string | null;
}
