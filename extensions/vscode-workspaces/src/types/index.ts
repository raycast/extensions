export interface Workspace {
  id: string;
  name: string;
  path: string;
}

export interface WorkspaceMetadata {
  isFavorite: boolean;
  lastOpened?: number; // timestamp
  tags?: string[];
  preferredEditor?: string;
}

export interface WorkspaceWithMetadata extends Workspace {
  icon: string;
  metadata: WorkspaceMetadata;
}

export type SortOption = "alphabetical" | "recently-opened" | "favorites-first" | "project-type";

export interface ExtensionPreferences {
  defaultSortOption: SortOption;
  defaultEditor: EditorVariant;
  defaultTerminal: string;
}

export type EditorVariant = "code" | "code-insiders" | "vscodium" | "cursor";
