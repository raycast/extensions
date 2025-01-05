export type OrderBy = "size" | "newest" | "oldest";

export type Items = {
  id: string;
  title: string;
  lastModified: Date;
  size: number;
};
