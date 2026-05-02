import type { ReactNode } from "react";
import type { FinderTag, Item } from "$lib/types";

export type ItemDetailProps = {
  entry: Item;
  directoryTarget?: ReactNode;
  symlinkDirectoryTarget?: ReactNode;
  editTarget?: ReactNode;
  tagCatalog?: FinderTag[];
  onTrashItems?: (paths: string[]) => void;
  revalidate?: () => void;
};
