export type SortMode =
  | "name-asc"
  | "kind-asc"
  | "date-last-opened-asc"
  | "date-added-desc"
  | "date-modified-asc"
  | "date-created-asc"
  | "size-asc"
  | "tags-asc";

export type FinderTag = {
  name: string;
  colorIndex: number | null;
};

export type Item = {
  type: "directory" | "file" | "symlink";
  name: string;
  path: string;
  size: number;
  isPackageLike?: boolean;
  isMountRoot?: boolean;
  userTags: FinderTag[];
  attributeChangeDate: number;
  contentCreationDate: number;
  contentModificationDate: number;
  contentType: string;
  finderComment: string;
  kind: string;
  lastUsedDate: number | null;
  fsContentChangeDate: number;
  fsCreationDate: number;
  fsInvisible: boolean;
};
