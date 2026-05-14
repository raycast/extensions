import { Keyboard } from "@raycast/api";

type SpotlightSearchPreferences = {
  maxResults: number;
  pluginsEnabled: boolean;
  pluginsFolder: string;
  showNonCloudLibraryPaths: boolean;
  filterLibraryFolders: boolean;
  pinned: SpotlightSearchResult[];
  searchScope: string;
  isShowingDetail: boolean;
  openFolderAfterMove: boolean;
};

type FolderSearchPlugin = {
  title: string;
  shortcut: Keyboard.Shortcut;
  icon: string;
  appleScript: (result: SpotlightSearchResult) => string;
};

type SpotlightSearchDefinition = string[];

type SpotlightSearchResult = {
  path: string;
  kMDItemFSName: string;
  kMDItemKind: string;
  kMDItemFSSize: number;
  kMDItemFSCreationDate: string;
  kMDItemContentModificationDate: string;
  kMDItemLastUsedDate: string;
  kMDItemUseCount: number;
};

export type { FolderSearchPlugin, SpotlightSearchPreferences, SpotlightSearchDefinition, SpotlightSearchResult };
