import { launchCommand, LaunchProps } from "@raycast/api";

export type Color = {
  alpha: number;
  red: number; // between 0 and 1
  green: number; // between 0 and 1
  blue: number; // between 0 and 1
  colorSpace: string;
};

export type DeprecatedColor = {
  alpha: number;
  red: number; // between 0 and 255
  green: number; // between 0 and 255
  blue: number; // between 0 and 255
};

// The history color can also be an hex string
export type HistoryColor = Color | DeprecatedColor | string;

export type HistoryItem = {
  date: string;
  color: HistoryColor;
  title?: string;
};

export type ColorItem = {
  id: string;
  color: string;
};

export type LaunchOptions = Parameters<typeof launchCommand>[0];

export type PickColorCommandLaunchProps = LaunchProps<{
  launchContext: {
    source?: "menu-bar" | "organize-colors";
    copyToClipboard?: boolean;
    colorFormat?: string;
    callbackLaunchOptions?: LaunchOptions;
  };
}>;

export type SortType = "platform" | "proximity";

export type ColorFormatType =
  | "hex"
  | "hex-lower-case"
  | "hex-no-prefix"
  | "rgb"
  | "rgb-percentage"
  | "rgba"
  | "rgba-percentage"
  | "hsla"
  | "hsva"
  | "oklch"
  | "lch"
  | "p3";

export type UseColorsSelectionObject = {
  actions: {
    toggleSelection: (item: ColorItem) => void;
    selectAll: () => void;
    clearSelection: () => void;
  };
  selected: {
    selectedItems: Set<ColorItem>;
    anySelected: boolean;
    allSelected: boolean;
    countSelected: number;
  };
  helpers: {
    getIsItemSelected: (item: ColorItem) => boolean;
  };
};

export type UseFormColorsObject = {
  count: number;
  addColor: () => void;
  removeColor: () => void;
  resetColors: () => void;
};

export type UseFormKeywordsObject = {
  keywords: string[] | undefined;
  update: (keywordsText: string) => Promise<UpdateKeywordsPromiseResult>;
};

export type UseFormActionsObject = {
  clear: () => void;
  addColor: () => void;
  removeColor: () => void;
  updateKeywords: (keywordsText: string) => Promise<UpdateKeywordsPromiseResult>;
};

export type UseFormFocusObject = {
  field: string | null;
  set: (fieldId: string | null) => void;
  create: (fieldId: string) => {
    onFocus: () => void;
    onBlur: () => void;
  };
};

export type OrganizeColorsActionsProps = {
  historyItem: HistoryItem;
  colorItem: ColorItem;
  formattedColor: string;
  isSelected: boolean;
  selection: UseColorsSelectionObject;
};

export type GenerateColorsActionsProps = {
  colorItem: ColorItem;
  selection: UseColorsSelectionObject;
  prompt: string;
};

export type PaletteFormFields = {
  name: string;
  description: string;
  mode: string;
  keywords: string[];
  editId?: string;
  [key: `color${number}`]: string;
};

export interface SavePaletteFormProps extends LaunchProps {
  launchContext?: {
    selectedColors?: ColorItem[];
    text?: string;
  };
  draftValues?: PaletteFormFields;
}

export type SavedPalette = {
  id: string;
  name: string;
  description: string;
  mode: "light" | "dark";
  keywords: string[];
  colors: string[];
  createdAt: string;
};

export type UpdateKeywordsPromiseResult = {
  validKeywords: string[];
  invalidKeywords: string[];
  removedKeywords: string[];
  duplicateKeywords: string[];
  totalProcessed: number;
};

export type CopyPaletteFormat = "json" | "css" | "txt" | "css-variables";

export type ManagePaletteActions = {
  delete: (paletteId: string, paletteName: string) => Promise<void>;
  createEdit: (palette: SavedPalette) => PaletteFormFields;
  duplicate: (palette: SavedPalette) => Promise<void>;
};
