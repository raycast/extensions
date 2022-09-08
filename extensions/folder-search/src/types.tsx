type SpotlightSearchPreferences = {
  maxResults: number;
};

type SpotlightSearchDefinition = string[];

type SpotlightSearchResult = {
  path: string;
  kMDItemFSName: string;
  kMDItemKind: string;
  kMDItemFSSize: number;
  kMDItemFSCreationDate: Date;
  kMDItemContentModificationDate: Date;
  kMDItemLastUsedDate: Date;
};

export type { SpotlightSearchPreferences, SpotlightSearchDefinition, SpotlightSearchResult };
