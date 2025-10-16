export interface SpotlightSearchPreferences {
  maxResults: number;
  maxRecentFolders: string;
}

export interface SpotlightSearchDefinition extends Array<string> {}

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
  pinnedAt: Date;
  lastVerified: Date;
}
