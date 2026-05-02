import type { ReactNode } from "react";
import type { FinderTag, Item } from "$lib/types";

export type ItemActionsProps = {
  entry: Item;
  directoryTarget?: ReactNode;
  symlinkDirectoryTarget?: ReactNode;
  editTarget?: ReactNode;
  onTrashItems?: (paths: string[]) => void;
  revalidate?: () => void;
};

export type ItemMetadataProps = {
  entry: Item;
  tagCatalog?: FinderTag[];
};

export type FolderTreeOptions = {
  maxDepth?: number; // depth starting at 1 for children of root
  maxNodes?: number; // total nodes budget across the tree
  skipDotfiles?: boolean;
  label?: string;
};
