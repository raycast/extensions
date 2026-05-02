import type { ReactNode } from "react";
import type { FinderTag, Item } from "$lib/types";

export type AppliedItemUpdate = {
  /** Current path after rename (may differ from previousPath if name changed) */
  path: string;
  /** Original entry.path before any rename */
  previousPath: string;
  name: string;
  finderComment: string;
  userTags: FinderTag[];
};

export type ItemEditProps = {
  entry: Item;
  directoryTarget?: ReactNode;
  symlinkDirectoryTarget?: ReactNode;
  siblingDirectories?: Item[];
  onApplied?: (update: AppliedItemUpdate) => void;
  onCreateFolder?: (name: string) => Promise<void>;
  onCopyItem?: (destinationPath: string) => Promise<void>;
  onMoveItem?: (destinationPath: string) => Promise<void>;
};
