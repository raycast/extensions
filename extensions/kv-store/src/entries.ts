export const STORAGE_KEY = "entries";
export const CATEGORY_STORAGE_KEY = "categories";

export type Entry = {
  id: string;
  key: string;
  value: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
