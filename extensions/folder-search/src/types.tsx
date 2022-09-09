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

export type { SpotlightSearchDefinition, SpotlightSearchResult };
