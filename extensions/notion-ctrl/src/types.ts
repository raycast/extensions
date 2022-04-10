export type Preferences = {
  NOTION_INTEGRATION_TOKEN: string;
};
export type PostContents = {
  databaseId: string;
  title: string;
  content: string;
  category?: string;
  tags?: string;
  date?: Date | null;
};
export type Database = {
  id: string;
  title: string;
  categories: string[] | null;
  tags: string[] | null;
  check: boolean;
  date: boolean;
  updatedAt?: string;
};
export type UpsertedDatabase = Database & {
  updatedAt: string;
};
