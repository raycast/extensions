export interface Bookmark {
  id: string;
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  note?: string;
  archived: boolean;
  deletedAt?: string | null;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  _count?: { bookmarks: number };
}

export interface Tag {
  id: string;
  name: string;
  count: number;
}

export interface SidebarData {
  folders: Folder[];
  tags: Tag[];
}

export interface CreateBookmarkPayload {
  url: string;
  title?: string;
  description?: string;
  note?: string;
  folderId?: string;
  tagIds?: string[];
}

export interface UpdateBookmarkPayload {
  url?: string;
  title?: string;
  description?: string;
  note?: string;
  folderId?: string | null;
  archived?: boolean;
  tagIds?: string[];
}
