export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: string;
  favicon?: string | null;
  tagIds: string[];
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  groupId?: string;
  createdAt: string;
}

export interface TagGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface StorageData {
  bookmarks: Bookmark[];
  tags: Tag[];
  tagGroups: TagGroup[];
}
