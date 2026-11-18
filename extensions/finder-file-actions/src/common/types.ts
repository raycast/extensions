export interface SpotlightSearchPreferences {
  maxResults: number;
  maxRecentFolders: string;
}

export type SpotlightSearchDefinition = string[];

export interface SpotlightSearchResult {
  path: string;
  kMDItemFSName: string;
  kMDItemDisplayName?: string;
  kMDItemKind: string;
  kMDItemFSSize: number;
  kMDItemFSCreationDate: Date;
  kMDItemContentModificationDate: Date;
  kMDItemLastUsedDate: Date;
  kMDItemUseCount: number;
}

export interface PinnedFolder extends SpotlightSearchResult {
  customName?: string;
  pinnedAt: Date;
  lastVerified: Date;
}
