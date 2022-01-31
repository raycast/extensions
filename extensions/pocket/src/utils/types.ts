export interface Bookmark {
  id: string;
  title: string;
  originalUrl: string;
  pocketUrl: string;
  type: "article" | "video";
  favorite: boolean;
  tags: Array<string>;
  author?: string;
  updatedAt: Date;
}
