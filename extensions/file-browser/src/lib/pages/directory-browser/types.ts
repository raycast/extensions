import type {
  AccessoryFlags,
  ContentsSortMode,
  ContentsViewMode,
  EnterKeyAction,
} from "$lib/components/contents/types";

export type DirectoryBrowserProps = {
  path: string;
  initialView: ContentsViewMode;
  initialSort: ContentsSortMode;
  gridColumns: number;
  enabledAccessories: AccessoryFlags;
  enterAction: EnterKeyAction;
  onPathVisited?: (path: string) => void;
};
