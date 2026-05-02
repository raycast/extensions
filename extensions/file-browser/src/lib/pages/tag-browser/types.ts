import type {
  AccessoryFlags,
  ContentsSortMode,
  ContentsViewMode,
  EnterKeyAction,
} from "$lib/components/contents/types";

export type TagBrowserProps = {
  initialView: ContentsViewMode;
  initialSort: ContentsSortMode;
  gridColumns: number;
  enabledAccessories: AccessoryFlags;
  enterAction: EnterKeyAction;
};
