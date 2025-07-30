// Collection Types
export type Collection = {
  collectionId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  parentFolderId?: string;
  shortId: string;
};

export type CreateCollectionInput = {
  name: string;
  description?: string;
  isPublic?: boolean;
  parentFolderId?: string;
};

export type AddLinkInput = {
  url: string;
  title?: string;
  image?: string;
  description?: string;
  collectionId?: string;
};

export type PageInfo = {
  title: string;
  hostname: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
};

// Folder Types
export type Folder = {
  folderId: string;
  name: string;
  isPublic: boolean;
  collectionIds: string[];
  parentFolderId?: string;
  shortId: string;
  userId: string;
};

export type CreateFolderInput = {
  name: string;
};

// Link Types
export type LinkResponse = {
  data: string;
  type: string;
  itemId: string;
  authors: string[];
  userId: string;
};

// Limits Types
export type Limits = {
  monthlyAvailable: number | null;
  monthlyLimit: number | null;
  monthlyUsed: number | null;
};
