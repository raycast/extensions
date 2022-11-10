import { Keyboard } from "@raycast/api";

type SpotlightSearchPreferences = {
  maxResults: number;
  pluginsEnabled: boolean;
  pluginsFolder: string;
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
  kMDItemFSCreationDate: Date;
  kMDItemContentModificationDate: Date;
  kMDItemLastUsedDate: Date;
  kMDItemUseCount: number;
};

export type { FolderSearchPlugin, SpotlightSearchPreferences, SpotlightSearchDefinition, SpotlightSearchResult };
