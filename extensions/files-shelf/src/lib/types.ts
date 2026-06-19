export interface ShelfItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
}

export interface ShelfItemWithStatus extends ShelfItem {
  isStale?: boolean;
  staleReason?: "deleted" | "inaccessible";
}

export type RenameMode = "prefix" | "suffix" | "numbering" | "replace";

export interface RenameOptions {
  mode: RenameMode;
  prefix?: string;
  suffix?: string;
  startNumber?: number;
  padding?: number;
  find?: string;
  replace?: string;
}

export interface ExpressionRenameOptions {
  expression: string;
  matchPattern?: string;
}

export interface RenamePreview {
  item: ShelfItem;
  oldName: string;
  newName: string;
  newPath: string;
}

export interface RenamePreviewWithConflicts extends RenamePreview {
  conflict?: "duplicate_in_batch" | "exists_in_directory";
  conflictsWith?: string;
}

export interface ValidationResult {
  valid: ShelfItem[];
  stale: ShelfItem[];
  hasIssues: boolean;
}
