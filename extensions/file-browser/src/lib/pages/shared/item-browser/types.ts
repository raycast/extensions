import type { ReactNode } from "react";
import type {
  AccessoryFlags,
  ContentsSortMode,
  ContentsViewMode,
  EnterKeyAction,
} from "$lib/components/contents/types";
import type { AppliedItemUpdate } from "$lib/pages/item-edit/types";
import type { FinderTag, Item } from "$lib/types";

export type ItemBrowserDirectoryTargetFactory = (directoryPath: string) => ReactNode;

export type ItemBrowserItemActionCallbacks = {
  onCreateFolder?: (name: string) => Promise<void>;
  onCopyItem?: (destinationPath: string) => Promise<void>;
  onMoveItem?: (destinationPath: string) => Promise<void>;
  onApplied?: (update: AppliedItemUpdate) => void;
  onTrashItems?: (paths: string[]) => void;
  siblingDirectories?: Item[];
  revalidate?: () => void;
};

export type ItemBrowserItemActionCallbacksFactory<TItem extends Item = Item> = (
  item: TItem,
) => ItemBrowserItemActionCallbacks;

export type ItemBrowserSectionBuilderProps<TItem extends Item = Item> = {
  items: TItem[];
  renderItem: (item: TItem) => ReactNode;
};

export type ItemBrowserPresenterProps = {
  items: Item[];
  view: ContentsViewMode;
  onViewChange: (view: ContentsViewMode) => void;
  sort: ContentsSortMode;
  onSortChange: (sort: ContentsSortMode) => void;
  gridColumns: number;
  enabledAccessories: AccessoryFlags;
  enterAction: EnterKeyAction;
  isLoading: boolean;
  pathLabel: string;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: ReactNode;
  tagCatalog?: FinderTag[];
  createDirectoryTarget: ItemBrowserDirectoryTargetFactory;
  createItemActionCallbacks?: ItemBrowserItemActionCallbacksFactory;
};
