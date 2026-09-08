export interface Shortcut {
  id: string;
  category?: string;
  title: string;
  keys: string;
  tags?: string[];
  source?: "discover";
  sourceFile?: string;
}

export type NewShortcut = Omit<Shortcut, "id">;

export const UNCATEGORIZED = "Uncategorized";
export const STORAGE_KEY = "shortcuts";
