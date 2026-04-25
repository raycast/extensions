import { Form, LaunchProps } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { SetStateAction } from "react";

export type ColorItem = {
  id: string;
  color: string;
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
  getPreview: () => { colors: string[] };
};

export type UseFormFocusObject = {
  currentField: string | null;
  lastField: string | null;
  set: (fieldId: string | null) => void;
  create: (fieldId: string) => {
    onFocus: () => void;
    onBlur: () => void;
  };
};

export type PaletteFormFields = {
  name: string;
  description: string;
  mode: string;
  keywords: string[];
  editId?: string;
  [key: `color${number}`]: string;
};

export type AICreatedText = {
  title: string;
  description: string;
};

export type AILaunchContext = {
  selectedColors?: ColorItem[];
  AItext?: AICreatedText;
};

export interface SavePaletteFormProps extends LaunchProps {
  launchContext?: AILaunchContext;
  draftValues?: PaletteFormFields;
  /** Called after an edit submit. Lets the parent (Manage Color Palettes) sync its in-memory state. */
  onPaletteUpdated?: (palettes: SavedPalette[]) => Promise<void> | void;
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

export type FormColorItems = Record<string, Partial<Form.ItemProps<string>> & { id: string }>;

export type UseFormPaletteObject = {
  submit: (values: PaletteFormFields) => boolean | void | Promise<boolean | void>;
  items: ReturnType<typeof useForm<PaletteFormFields>>["itemProps"];
  reset: (values: PaletteFormFields) => void;
  update: <K extends keyof PaletteFormFields>(id: K, value: SetStateAction<PaletteFormFields[K]>) => void;
  colors: FormColorItems;
  hasEmptyColorFields: boolean;
  hasValidColorFields: boolean;
};
