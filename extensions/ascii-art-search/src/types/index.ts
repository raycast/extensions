/**
 * Core type definitions for the ASCII Art extension
 */

// Item types
export const ITEM_TYPES = ["kaomoji", "aa"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

// Category type (dynamically derived from API data)
export type Category = string;

// Special category for generated ASCII art
export const GENERATED_CATEGORY: Category = "generated";

// Localized string pair
export interface LocalizedString {
  ja: string;
  en: string;
}

// Main data item interface
export interface Kaomoji {
  text: string;
  name: LocalizedString;
  keywords: string[];
  type: ItemType;
  category: Category;
  credit?: string;
}

// User preferences from Raycast
export interface Preferences {
  gridColumns: string;
}

// Action handlers for grid items
export interface ItemActionHandlers {
  onCopy: (item: Kaomoji) => Promise<void>;
  onPaste: (item: Kaomoji) => Promise<void>;
  onPasteKeepOpen: (item: Kaomoji) => Promise<void>;
  onCopyUnicode: (item: Kaomoji) => Promise<void>;
  onCopyAllFromSection: (items: Kaomoji[]) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onToggleType: () => Promise<void>;
  onRemoveCustomArt?: (text: string) => Promise<void>;
  isCustomArt?: (text: string) => boolean;
}
