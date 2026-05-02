import type { List, Grid } from "@raycast/api";
import type { ReactElement, ReactNode } from "react";
import type { FinderTag, Item, SortMode } from "$lib/types";

export type ContentsViewMode = "list" | "grid";

type ListRoot = typeof List;
type GridRoot = typeof Grid;
type ListItem = ListRoot["Item"];
type GridItem = GridRoot["Item"];
type ListDropdown = ListRoot["Dropdown"];
type GridDropdown = GridRoot["Dropdown"];

export type ContentsSortMode = SortMode;

export type AccessoryFlags = {
  showHidden?: boolean;
  showLastUsed?: boolean;
  showTags?: boolean;
  showSize?: boolean;
  showAttrChanged?: boolean;
  showCreated?: boolean;
  showContentChanged?: boolean;
};

export interface ContentDropdownProps {
  view: ContentsViewMode;
  onViewChange: (view: ContentsViewMode) => void;
  sort: ContentsSortMode;
  onSortChange: (sort: ContentsSortMode) => void;
}

export type EnterKeyAction = "detail" | "open";

export type ContentsItemActionPanelProps = {
  type: Item["type"];
  path: string;
  siblingDirectories?: Item[];
  target?: ReactNode;
  symlinkDirectoryTarget?: ReactNode;
  detail?: ReactNode;
  edit?: ReactNode;
  enterAction: EnterKeyAction;
  onCreateFolder?: (name: string) => Promise<void>;
  onMoveItem?: (destinationPath: string) => Promise<void>;
  onCopyItem?: (destinationPath: string) => Promise<void>;
  onTrashItems?: (paths: string[]) => void;
  revalidate?: () => void;
};

export interface ContentsItemProps {
  entry: Item;
  actions: ReactNode;
  enabledAccessories: AccessoryFlags;
  totalEntries?: number;
  tagCatalog?: FinderTag[];
}

export type ContentsSection = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export interface ContentsProps {
  children?: ReactNode;
  counts: number;
  view: ContentsViewMode;
  path: string;
  isLoading: boolean;
  searchBarAccessory: ReactElement<List.Dropdown.Props | Grid.Dropdown.Props>;
  searchBarPlaceholder?: string;
  columns: number;
  emptyTitle?: string;
  emptyDescription?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  sections?: ContentsSection[];
  actions?: ReactNode;
}

export type ViewComponents = {
  view: ContentsViewMode;
  Container: ListRoot | GridRoot;
  Item: ListItem | GridItem;
  Dropdown: ListDropdown | GridDropdown;
};

export type ViewRegistry = Record<ContentsViewMode, ViewComponents>;
