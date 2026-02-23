export type HotkeyCategory =
  | "Canvas"
  | "Selection"
  | "Layers"
  | "Design"
  | "View"
  | "Tools"
  | "Text"
  | "Comments"
  | "General";

export interface FigmaHotkey {
  id: string;
  action: string;
  winShortcut: string;
  macShortcut?: string;
  category: HotkeyCategory;
}

export const FIGMA_HOTKEYS: FigmaHotkey[] = [
  // Canvas
  {
    id: "pan",
    action: "Pan canvas",
    winShortcut: "Arrow keys",
    macShortcut: "Arrow keys",
    category: "Canvas",
  },
  {
    id: "pan-fast",
    action: "Pan canvas (faster)",
    winShortcut: "Shift + Arrow keys",
    macShortcut: "Shift + Arrow keys",
    category: "Canvas",
  },
  {
    id: "zoom-in",
    action: "Zoom in",
    winShortcut: "Ctrl + +",
    macShortcut: "⌘ + +",
    category: "Canvas",
  },
  {
    id: "zoom-out",
    action: "Zoom out",
    winShortcut: "Ctrl + -",
    macShortcut: "⌘ + -",
    category: "Canvas",
  },
  {
    id: "zoom-fit",
    action: "Zoom to fit",
    winShortcut: "Shift + 1",
    macShortcut: "Shift + 1",
    category: "Canvas",
  },
  {
    id: "zoom-100",
    action: "Zoom to 100%",
    winShortcut: "Shift + 0",
    macShortcut: "Shift + 0",
    category: "Canvas",
  },
  {
    id: "zoom-selection",
    action: "Zoom to selection",
    winShortcut: "Shift + 2",
    macShortcut: "Shift + 2",
    category: "Canvas",
  },
  {
    id: "zoom-previous",
    action: "Previous zoom",
    winShortcut: "Shift + N",
    macShortcut: "Shift + N",
    category: "Canvas",
  },

  // Selection
  {
    id: "keyboard-box",
    action: "Keyboard box selection tool",
    winShortcut: "Ctrl + Space",
    macShortcut: "Option + Space",
    category: "Selection",
  },
  {
    id: "select-object",
    action: "Select object (keyboard box)",
    winShortcut: "Enter",
    macShortcut: "Return",
    category: "Selection",
  },
  {
    id: "child-layers",
    action: "Move between child layers",
    winShortcut: "Tab / Shift + Tab",
    macShortcut: "Tab / Shift + Tab",
    category: "Selection",
  },
  {
    id: "selection-box",
    action: "Resize selection box",
    winShortcut: "Ctrl + Arrow keys",
    macShortcut: "⌘ + Arrow keys",
    category: "Selection",
  },
  {
    id: "close-keyboard-box",
    action: "Close keyboard box selection",
    winShortcut: "Esc",
    macShortcut: "Esc",
    category: "Selection",
  },
  {
    id: "select-all",
    action: "Select all",
    winShortcut: "Ctrl + A",
    macShortcut: "⌘ + A",
    category: "Selection",
  },
  {
    id: "deselect",
    action: "Deselect",
    winShortcut: "Ctrl + Shift + A",
    macShortcut: "⌘ + Shift + A",
    category: "Selection",
  },
  {
    id: "select-same",
    action: "Select same (fill/style)",
    winShortcut: "Ctrl + Alt + E",
    macShortcut: "⌘ + Option + E",
    category: "Selection",
  },

  // Layers
  {
    id: "place-object",
    action: "Place new object",
    winShortcut: "Enter",
    macShortcut: "Return",
    category: "Layers",
  },
  {
    id: "focus-toolbar",
    action: "Focus toolbar",
    winShortcut: "Ctrl + F6",
    macShortcut: "F6",
    category: "Layers",
  },
  {
    id: "group",
    action: "Group selection",
    winShortcut: "Ctrl + G",
    macShortcut: "⌘ + G",
    category: "Layers",
  },
  {
    id: "ungroup",
    action: "Ungroup",
    winShortcut: "Ctrl + Shift + G",
    macShortcut: "⌘ + Shift + G",
    category: "Layers",
  },
  {
    id: "frame",
    action: "Frame selection",
    winShortcut: "Ctrl + Alt + G",
    macShortcut: "⌘ + Option + G",
    category: "Layers",
  },
  {
    id: "flatten",
    action: "Flatten selection",
    winShortcut: "Ctrl + Shift + Alt + F",
    macShortcut: "⌘ + Shift + Option + F",
    category: "Layers",
  },
  {
    id: "bring-forward",
    action: "Bring forward",
    winShortcut: "Ctrl + ]",
    macShortcut: "⌘ + ]",
    category: "Layers",
  },
  {
    id: "send-backward",
    action: "Send backward",
    winShortcut: "Ctrl + [",
    macShortcut: "⌘ + [",
    category: "Layers",
  },
  {
    id: "bring-to-front",
    action: "Bring to front",
    winShortcut: "Ctrl + Shift + ]",
    macShortcut: "⌘ + Shift + ]",
    category: "Layers",
  },
  {
    id: "send-to-back",
    action: "Send to back",
    winShortcut: "Ctrl + Shift + [",
    macShortcut: "⌘ + Shift + [",
    category: "Layers",
  },
  {
    id: "hide",
    action: "Hide layer",
    winShortcut: "Ctrl + Shift + H",
    macShortcut: "⌘ + Shift + H",
    category: "Layers",
  },
  {
    id: "lock",
    action: "Lock / Unlock layer",
    winShortcut: "Ctrl + Shift + L",
    macShortcut: "⌘ + Shift + L",
    category: "Layers",
  },
  {
    id: "rename",
    action: "Rename layer",
    winShortcut: "Ctrl + Alt + R",
    macShortcut: "⌘ + Option + R",
    category: "Layers",
  },
  {
    id: "duplicate",
    action: "Duplicate",
    winShortcut: "Ctrl + D",
    macShortcut: "⌘ + D",
    category: "Layers",
  },
  {
    id: "copy",
    action: "Copy",
    winShortcut: "Ctrl + C",
    macShortcut: "⌘ + C",
    category: "Layers",
  },
  {
    id: "paste",
    action: "Paste",
    winShortcut: "Ctrl + V",
    macShortcut: "⌘ + V",
    category: "Layers",
  },
  {
    id: "paste-in-place",
    action: "Paste in place",
    winShortcut: "Ctrl + Shift + V",
    macShortcut: "⌘ + Shift + V",
    category: "Layers",
  },
  {
    id: "delete",
    action: "Delete",
    winShortcut: "Delete / Backspace",
    macShortcut: "Delete / Backspace",
    category: "Layers",
  },

  // Design
  {
    id: "outline-stroke",
    action: "Outline stroke",
    winShortcut: "Ctrl + Shift + O",
    macShortcut: "⌘ + Shift + O",
    category: "Design",
  },
  {
    id: "boolean-union",
    action: "Boolean union",
    winShortcut: "Ctrl + Alt + U",
    macShortcut: "⌘ + Option + U",
    category: "Design",
  },
  {
    id: "boolean-subtract",
    action: "Boolean subtract",
    winShortcut: "Ctrl + Alt + S",
    macShortcut: "⌘ + Option + S",
    category: "Design",
  },
  {
    id: "boolean-intersect",
    action: "Boolean intersect",
    winShortcut: "Ctrl + Alt + I",
    macShortcut: "⌘ + Option + I",
    category: "Design",
  },
  {
    id: "boolean-exclude",
    action: "Boolean exclude",
    winShortcut: "Ctrl + Alt + X",
    macShortcut: "⌘ + Option + X",
    category: "Design",
  },
  {
    id: "mask",
    action: "Use as mask",
    winShortcut: "Ctrl + Alt + M",
    macShortcut: "⌘ + Option + M",
    category: "Design",
  },
  {
    id: "flip-h",
    action: "Flip horizontal",
    winShortcut: "Shift + H",
    macShortcut: "Shift + H",
    category: "Design",
  },
  {
    id: "flip-v",
    action: "Flip vertical",
    winShortcut: "Shift + V",
    macShortcut: "Shift + V",
    category: "Design",
  },

  // View
  {
    id: "shortcuts-panel",
    action: "Open shortcuts panel",
    winShortcut: "Ctrl + Shift + ?",
    macShortcut: "Control + Shift + ?",
    category: "View",
  },
  {
    id: "toggle-ui",
    action: "Toggle UI (hide/show panels)",
    winShortcut: "Ctrl + \\",
    macShortcut: "⌘ + \\",
    category: "View",
  },
  {
    id: "toggle-grid",
    action: "Toggle layout grid",
    winShortcut: "Ctrl + '",
    macShortcut: "⌘ + '",
    category: "View",
  },
  {
    id: "toggle-rulers",
    action: "Toggle rulers",
    winShortcut: "Ctrl + Shift + R",
    macShortcut: "⌘ + Shift + R",
    category: "View",
  },
  {
    id: "show-pixels",
    action: "Show pixels",
    winShortcut: "Ctrl + Alt + '",
    macShortcut: "⌘ + Option + '",
    category: "View",
  },
  {
    id: "outline-mode",
    action: "Outline view",
    winShortcut: "Ctrl + Alt + Y",
    macShortcut: "⌘ + Option + Y",
    category: "View",
  },

  // Tools
  {
    id: "move",
    action: "Move tool (V)",
    winShortcut: "V",
    macShortcut: "V",
    category: "Tools",
  },
  {
    id: "frame-tool",
    action: "Frame tool (F)",
    winShortcut: "F",
    macShortcut: "F",
    category: "Tools",
  },
  {
    id: "rectangle",
    action: "Rectangle (R)",
    winShortcut: "R",
    macShortcut: "R",
    category: "Tools",
  },
  {
    id: "ellipse",
    action: "Ellipse (O)",
    winShortcut: "O",
    macShortcut: "O",
    category: "Tools",
  },
  {
    id: "line",
    action: "Line (L)",
    winShortcut: "L",
    macShortcut: "L",
    category: "Tools",
  },
  {
    id: "pen",
    action: "Pen (P)",
    winShortcut: "P",
    macShortcut: "P",
    category: "Tools",
  },
  {
    id: "text",
    action: "Text (T)",
    winShortcut: "T",
    macShortcut: "T",
    category: "Tools",
  },
  {
    id: "hand",
    action: "Hand (H)",
    winShortcut: "H",
    macShortcut: "H",
    category: "Tools",
  },
  {
    id: "comment",
    action: "Comment (C)",
    winShortcut: "C",
    macShortcut: "C",
    category: "Tools",
  },

  // Text
  {
    id: "bold",
    action: "Bold",
    winShortcut: "Ctrl + B",
    macShortcut: "⌘ + B",
    category: "Text",
  },
  {
    id: "italic",
    action: "Italic",
    winShortcut: "Ctrl + I",
    macShortcut: "⌘ + I",
    category: "Text",
  },
  {
    id: "underline",
    action: "Underline",
    winShortcut: "Ctrl + U",
    macShortcut: "⌘ + U",
    category: "Text",
  },
  {
    id: "strikethrough",
    action: "Strikethrough",
    winShortcut: "Ctrl + Shift + X",
    macShortcut: "⌘ + Shift + X",
    category: "Text",
  },

  // Comments
  {
    id: "add-comment",
    action: "Add comment",
    winShortcut: "Ctrl + Alt + C",
    macShortcut: "⌘ + Option + C",
    category: "Comments",
  },

  // General
  {
    id: "actions-menu",
    action: "Open actions menu",
    winShortcut: "Ctrl + /",
    macShortcut: "⌘ + /",
    category: "General",
  },
  {
    id: "undo",
    action: "Undo",
    winShortcut: "Ctrl + Z",
    macShortcut: "⌘ + Z",
    category: "General",
  },
  {
    id: "redo",
    action: "Redo",
    winShortcut: "Ctrl + Shift + Z",
    macShortcut: "⌘ + Shift + Z",
    category: "General",
  },
  {
    id: "multi-select",
    action: "Multi-select (add to selection)",
    winShortcut: "Ctrl + Click",
    macShortcut: "⌘ + Click",
    category: "General",
  },
];

const CATEGORY_ORDER: HotkeyCategory[] = [
  "Canvas",
  "Selection",
  "Layers",
  "Design",
  "View",
  "Tools",
  "Text",
  "Comments",
  "General",
];

export function getHotkeysByCategory(): Map<HotkeyCategory, FigmaHotkey[]> {
  const map = new Map<HotkeyCategory, FigmaHotkey[]>();
  for (const cat of CATEGORY_ORDER) {
    map.set(
      cat,
      FIGMA_HOTKEYS.filter((h) => h.category === cat),
    );
  }
  return map;
}
