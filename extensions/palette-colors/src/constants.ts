import { Icon, Keyboard } from "@raycast/api";
import { CopyPaletteFormat, PaletteFormFields } from "./types";

export const DEFAULT_NAME = "";

export const DEFAULT_DESCRIPTION = "";

export const DEFAULT_MODE = "light";

export const DEFAULT_KEYWORDS: string[] = [];

export const DEFAULT_COLOR = "";

export const NAME_FIELD_MAXLENGTH = 30;

export const DESCRIPTION_FIELD_MAXLENGTH = 150;

export const MAX_COLOR_FIELDS = 15;

export const DEFAULT_COLOR_FIELDS = 10;

export const DEFAULT_EDIT_ID = undefined;

export const CLEAR_FORM_VALUES: PaletteFormFields = {
  name: DEFAULT_NAME,
  description: DEFAULT_DESCRIPTION,
  mode: DEFAULT_MODE,
  keywords: DEFAULT_KEYWORDS,
  editId: DEFAULT_EDIT_ID,
  color1: DEFAULT_COLOR,
};

/**
 * Copy format configurations with format-specific icons.
 */
export const COPY_FORMATS: Array<{
  format: CopyPaletteFormat;
  title: string;
  icon: Icon;
}> = [
  { format: "json", title: "Copy Colors as JSON", icon: Icon.CodeBlock },
  { format: "css", title: "Copy Colors as CSS Classes", icon: Icon.Brush },
  { format: "css-variables", title: "Copy Colors as CSS Variables", icon: Icon.Gear },
  { format: "txt", title: "Copy Colors as Plain Text", icon: Icon.Text },
];

/**
 * Centralized keyboard shortcuts for all commands and actions.
 */
export const SHORTCUTS = {
  // save-color-palette
  PREVIEW_PALETTE: {
    macOS: { modifiers: ["cmd", "shift"], key: "p" },
    Windows: { modifiers: ["ctrl", "shift"], key: "p" },
  },
  ADD_COLOR_FIELD: Keyboard.Shortcut.Common.New,
  REMOVE_COLOR_FIELD: Keyboard.Shortcut.Common.Remove,
  CLEAR_FORM: {
    macOS: { modifiers: ["ctrl"], key: "r" },
    Windows: { modifiers: ["ctrl"], key: "r" },
  },
  // create-colors-with-ai
  TOGGLE_SELECT_COLOR: {
    macOS: { modifiers: ["cmd"], key: "s" },
    Windows: { modifiers: ["ctrl"], key: "s" },
  },
  SELECT_ALL: {
    macOS: { modifiers: ["cmd", "shift"], key: "a" },
    Windows: { modifiers: ["ctrl", "shift"], key: "a" },
  },
  CLEAR_SELECTION: {
    macOS: { modifiers: ["cmd", "shift"], key: "z" },
    Windows: { modifiers: ["ctrl", "shift"], key: "z" },
  },
  SAVE_SELECTED: {
    macOS: { modifiers: ["cmd", "shift"], key: "enter" },
    Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
  },
  // manage-color-palettes
  EDIT_PALETTE: Keyboard.Shortcut.Common.Edit,
  DUPLICATE_PALETTE: Keyboard.Shortcut.Common.Duplicate,
  COPY_COOLORS_LINK: {
    macOS: { modifiers: ["cmd", "shift"], key: "," },
    Windows: { modifiers: ["ctrl", "shift"], key: "," },
  },
  DELETE_PALETTE: Keyboard.Shortcut.Common.Remove,
  COPY_PALETTE: Keyboard.Shortcut.Common.Copy,
} satisfies Record<string, Keyboard.Shortcut>;
