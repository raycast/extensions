export type BookmarkFile = {
  type: "file";
  path: string;
  title: string;
};

export type BookMarkGroup = {
  type: "group";
  title: string;
  items: BookmarkEntry[];
};

export type BookmarkEntry = BookmarkFile | BookMarkGroup;

export type BookMarkJson = {
  items: BookmarkEntry[];
};
