import { Keyboard } from "@raycast/api";

type SpotlightSearchPreferences = {
  maxResults: number;
  maxRecentFolders: string;
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
  kMDItemUseCount: number;
};

export type { SpotlightSearchPreferences, SpotlightSearchDefinition, SpotlightSearchResult };
