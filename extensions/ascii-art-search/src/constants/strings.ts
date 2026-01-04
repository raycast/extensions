/**
 * UI strings (English only per Raycast guidelines)
 */
import type { ItemType } from "../types";

export const STRINGS = {
  actions: {
    pasteToCode: "Paste to Code",
    pasteToActiveApp: "Paste to Active App",
    copyToClipboard: "Copy to Clipboard",
    pasteKeepOpen: "Paste and Keep Window Open",
    copyUnicode: "Copy Unicode",
    copyAllFromSection: "Copy All from Section",
    pin: "Pin",
    unpin: "Unpin",
    switchType: "Switch Type",
    openPreferences: "Open Preferences",
    saveToCollection: "Save to Collection",
    removeFromCollection: "Remove from Collection",
    edit: "Edit",
    generateAsciiArt: "Generate ASCII Art",
    submitArt: "Submit Art",
  },

  labels: {
    pinned: "Pinned",
    category: "Category",
    categories: "Categories",
    noResults: "No Results",
    noResultsDescription: "Try a different search term",
    searchSuffix: " search...",
    allSearch: "All search...",
    copied: "Copied",
    pasted: "Pasted",
    text: "Text",
    font: "Font",
    lines: "Lines",
    filterFonts: "Filter fonts...",
    enterTextPlaceholder: "Enter text to convert to ASCII art",
  },

  toasts: {
    pleaseEnterText: "Please enter text",
    copiedToClipboard: "Copied to clipboard",
    pastedSuccess: "Pasted",
    failedToSave: "Failed to save",
    failedToGenerate: "Failed to generate",
  },

  itemTypes: {
    all: "All",
    kaomoji: "Kaomoji",
    aa: "ASCII Art",
  } as Record<ItemType | "all", string>,

  categories: {
    all: "All",
  } as Record<string, string>,
} as const;

/**
 * Known category labels (for common categories)
 */
const CATEGORY_LABELS: Record<string, string> = {
  generated: "Generated",
  emotion: "Emotion",
  greeting: "Greeting",
  action: "Action",
  reaction: "Reaction",
  animal: "Animal",
  character: "Character",
  people: "People",
  food: "Food",
  symbol: "Symbol",
  decoration: "Decoration",
  meme: "Meme",
  status: "Status",
  other: "Other",
};

/**
 * Get category label (falls back to capitalized name for unknown categories)
 */
export function getCategoryLabel(category: string): string {
  if (category === "all") return STRINGS.categories.all;
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  // Capitalize first letter for unknown categories
  return category.charAt(0).toUpperCase() + category.slice(1);
}

type StringPath =
  | `actions.${keyof typeof STRINGS.actions}`
  | `labels.${keyof typeof STRINGS.labels}`
  | `toasts.${keyof typeof STRINGS.toasts}`
  | `categories.${keyof typeof STRINGS.categories}`
  | `itemTypes.${keyof typeof STRINGS.itemTypes}`;

/**
 * Get string by path
 * @example t("actions.pasteToCode")
 * @example t("labels.pinned")
 */
export function t(path: StringPath): string {
  const [section, key] = path.split(".") as [keyof typeof STRINGS, string];
  return (STRINGS[section] as Record<string, string>)[key];
}

/**
 * Create search placeholder text
 */
export function getSearchPlaceholder(selectedType: ItemType | "all"): string {
  if (selectedType === "all") {
    return STRINGS.labels.allSearch;
  }
  return `${STRINGS.itemTypes[selectedType]}${STRINGS.labels.searchSuffix}`;
}
