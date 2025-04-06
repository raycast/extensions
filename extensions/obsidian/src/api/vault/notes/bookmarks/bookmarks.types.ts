export type BookmarkFile = {
  type: "file";
  path: string;
  title: string;
};

export type BookmarkGroup = {
  type: "group";
  title: string;
  items: BookmarkEntry[];
};

export type BookmarkEntry = BookmarkFile | BookmarkGroup;

export type BookMarkJson = {
  items: BookmarkEntry[];
};
