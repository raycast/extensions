export type HistoryItem = {
  id: string;
  kind?: "text" | "image" | "file";
  /** Display text: the text itself, the file paths, or "Image W×H". */
  text: string;
  html?: string;
  /** RTF data, base64 encoded. */
  rtf?: string;
  imagePath?: string;
  files?: string[];
  /** Name of the app the item was copied from. */
  app?: string;
  copiedAt: number;
};

export type Snippet = {
  id: string;
  title: string;
  content: string;
};

export type SnippetFolder = {
  id: string;
  title: string;
  /** Disabled folders are hidden from the menus (like Clipy). */
  enabled: boolean;
  snippets: Snippet[];
};

export type Preferences = {
  maxHistory: string;
  reorder: boolean;
  dedupe: boolean;
  itemsInline: string;
  itemsPerFolder: string;
  maxTitleLength: string;
  numbered: boolean;
  numericShortcuts: boolean;
  tooltip: boolean;
  imagePreview: boolean;
  colorPreview: boolean;
  confirmClear: boolean;
  storeRich: boolean;
  storeImage: boolean;
  storeFile: boolean;
  excludedApps: string;
  pasteAfterSelect: boolean;
};
