export type SheetType = "custom" | "default" | "repository";
export interface CustomCheatsheet {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  description?: string;
}
export interface UserRepository {
  id: string;
  name: string;
  owner: string;
  description?: string;
  url: string;
  addedAt: number;
  lastAccessedAt?: number;
  isPrivate: boolean;
  defaultBranch: string;
  subdirectory?: string;
  lastSyncedAt?: number;
  revision?: string;
}
export interface RepositoryCheatsheet {
  id: string;
  repositoryId: string;
  slug: string;
  title: string;
  content: string;
  filePath: string;
  syncedAt: number;
  lastAccessedAt?: number;
  revision?: string;
}
export interface FavoriteCheatsheet {
  id: string;
  type: SheetType;
  slug: string;
  title: string;
  favoritedAt: number;
}
export interface ViewRecord {
  key: string;
  type: SheetType;
  slug: string;
  title: string;
  count: number;
  lastViewedAt: number;
}
export interface HiddenCheatsheet {
  key: string;
  type: SheetType;
  slug: string;
  title: string;
  hiddenAt: number;
}
export interface Library {
  version: 2;
  custom: CustomCheatsheet[];
  repositories: UserRepository[];
  sheets: RepositoryCheatsheet[];
  favorites: FavoriteCheatsheet[];
  hidden: HiddenCheatsheet[];
  views: ViewRecord[];
  unresolvedLegacyKeys: string[];
}
export interface File {
  path: string;
  mode: string;
  type: "tree" | "blob";
  sha: string;
  size: number;
  url: string;
}
