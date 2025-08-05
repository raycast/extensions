export interface SearchState {
  results: Dashboard[];
  isLoading: boolean;
}

export interface SearchResult {
  id: number;
  uid: string;
  name: string;
  uri: string;
  url: string;
  slug: string;
  type: string;
  tags: string[];
  isStarred: boolean;
  folderId: number;
  folderUid: string;
  folderTitle: string;
  folderUrl: string;
  sortMeta: number;
}

export interface Dashboard {
  id: number;
  uid: string;
  name: string;
  uri: string;
  url: string;
  slug: string;
  type: string;
  tags: string[];
  isStarred: boolean;
  folderId: number;
  folderUid: string;
  folderTitle: string;
  folderUrl: string;
  sortMeta: number;
}
