// Source: https://academy.bricksbuilder.io/builder/interface/keyboard-shortcuts/
// "mod" is Cmd on macOS and Ctrl on Windows, matching the "CMD / CTRL" notation in the Bricks docs.

export type Modifier = "mod" | "shift" | "alt";

export type Key =
  | { type: "char"; value: string }
  | { type: "special"; value: "up" | "down" | "left" | "right" | "delete" | "enter" | "esc" }
  // Gestures and key ranges that can't be pressed as a single combination, e.g. "1–8" or "hold Shift".
  | { type: "label"; value: string };

export type Category =
  "Saving & History" | "Panels & Tools" | "Elements" | "Navigation" | "Preview & Responsive" | "Other";

export const CATEGORIES: Category[] = [
  "Saving & History",
  "Panels & Tools",
  "Elements",
  "Navigation",
  "Preview & Responsive",
  "Other",
];

export interface Shortcut {
  id: string;
  title: string;
  category: Category;
  modifiers: Modifier[];
  key?: Key;
  note?: string;
  keywords?: string[];
}

const char = (value: string): Key => ({ type: "char", value });
const special = (value: Extract<Key, { type: "special" }>["value"]): Key => ({ type: "special", value });
const label = (value: string): Key => ({ type: "label", value });

export const SHORTCUTS: Shortcut[] = [
  // Saving & History
  { id: "save", title: "Save Changes", category: "Saving & History", modifiers: ["mod"], key: char("s") },
  {
    id: "force-save",
    title: "Force Save All Data",
    category: "Saving & History",
    modifiers: ["mod", "shift"],
    key: char("s"),
  },
  { id: "undo", title: "Undo", category: "Saving & History", modifiers: ["mod"], key: char("z") },
  { id: "redo", title: "Redo", category: "Saving & History", modifiers: ["mod", "shift"], key: char("z") },
  {
    id: "history",
    title: "Show History Panel",
    category: "Saving & History",
    modifiers: ["mod", "shift"],
    key: char("h"),
    keywords: ["revisions"],
  },

  // Panels & Tools
  {
    id: "command-palette",
    title: "Open Command Palette",
    category: "Panels & Tools",
    modifiers: ["mod"],
    key: char("k"),
    keywords: ["search", "commands"],
  },
  {
    id: "style-manager",
    title: "Toggle Style Manager",
    category: "Panels & Tools",
    modifiers: ["mod"],
    key: char("."),
    keywords: ["global styles", "theme", "colors", "variables"],
  },
  {
    id: "style-manager-tabs",
    title: "Switch Style Manager Tabs",
    category: "Panels & Tools",
    modifiers: [],
    key: label("1–8"),
    note: "Works while the Style Manager is open.",
  },
  {
    id: "builder-browser",
    title: "Toggle Builder Browser",
    category: "Panels & Tools",
    modifiers: ["mod", "shift"],
    key: char("."),
  },
  {
    id: "templates",
    title: "Open Builder Browser on Templates",
    category: "Panels & Tools",
    modifiers: ["mod", "shift"],
    key: char("l"),
    keywords: ["library", "templates"],
  },
  {
    id: "elements-panel",
    title: "Show Elements Panel",
    category: "Panels & Tools",
    modifiers: ["mod", "shift"],
    key: char("e"),
    note: "Also focuses the element search.",
    keywords: ["add element", "insert"],
  },
  {
    id: "components-panel",
    title: "Show Components Panel",
    category: "Panels & Tools",
    modifiers: ["mod", "shift"],
    key: char("c"),
  },
  {
    id: "structure-panel",
    title: "Show Structure Panel",
    category: "Panels & Tools",
    modifiers: ["mod", "shift"],
    key: char("x"),
    keywords: ["tree", "navigator", "layers"],
  },
  {
    id: "settings-search",
    title: "Focus Element Settings Search",
    category: "Panels & Tools",
    modifiers: ["mod", "shift"],
    key: char("f"),
    keywords: ["find control"],
  },
  {
    id: "quick-access-bar",
    title: "Go to Quick Access Bar Tab / Control Group",
    category: "Panels & Tools",
    modifiers: ["mod", "alt"],
    key: label("Number"),
  },

  // Elements
  {
    id: "copy",
    title: "Copy Selected Element(s)",
    category: "Elements",
    modifiers: ["mod"],
    key: char("c"),
    note: "Only when not editing text or an input.",
  },
  {
    id: "paste",
    title: "Paste Copied Element(s)",
    category: "Elements",
    modifiers: ["mod"],
    key: char("v"),
    note: "Only when not editing text or an input.",
  },
  {
    id: "duplicate",
    title: "Duplicate Selected Element",
    category: "Elements",
    modifiers: ["mod", "shift"],
    key: char("d"),
    keywords: ["clone"],
  },
  {
    id: "delete",
    title: "Delete Active Element (and Children)",
    category: "Elements",
    modifiers: ["mod"],
    key: special("delete"),
    keywords: ["remove"],
  },
  {
    id: "wrap",
    title: "Wrap in Configured Wrapper Element",
    category: "Elements",
    modifiers: ["mod", "shift"],
    key: char("p"),
    keywords: ["div", "block", "container"],
  },
  {
    id: "classes-ui",
    title: "Toggle Element Classes UI",
    category: "Elements",
    modifiers: ["mod"],
    key: special("enter"),
    keywords: ["css class", "selector"],
  },
  {
    id: "insert-outside",
    title: "Insert Element Outside Active Parent",
    category: "Elements",
    modifiers: ["mod"],
    key: label("Hold"),
    note: "Hold while inserting an element to place it outside the active nestable/parent element.",
  },
  {
    id: "shift-hold",
    title: "Adjust Spacing in Larger Steps / Edit New Element",
    category: "Elements",
    modifiers: ["shift"],
    key: label("Hold"),
    note: "Hold while dragging spacing or container size on the canvas: steps of 5 (custom units) or 10 (px).",
    keywords: ["padding", "margin", "gap", "drag"],
  },

  // Navigation
  {
    id: "next-element",
    title: "Edit Next Element (Same Level)",
    category: "Navigation",
    modifiers: ["mod", "shift"],
    key: special("down"),
    keywords: ["sibling"],
  },
  {
    id: "previous-element",
    title: "Edit Previous Element (Same Level)",
    category: "Navigation",
    modifiers: ["mod", "shift"],
    key: special("up"),
    keywords: ["sibling"],
  },
  {
    id: "first-child",
    title: "Edit First Child Element",
    category: "Navigation",
    modifiers: ["mod", "shift"],
    key: special("right"),
  },
  {
    id: "parent-element",
    title: "Edit Parent Element (Container)",
    category: "Navigation",
    modifiers: ["mod", "shift"],
    key: special("left"),
  },
  {
    id: "toolbar-focus",
    title: "Focus Toolbar",
    category: "Navigation",
    modifiers: ["alt"],
    key: char("t"),
    note: "Then Tab through the toolbar.",
    keywords: ["accessibility", "keyboard"],
  },

  // Preview & Responsive
  {
    id: "preview",
    title: "Toggle Preview Mode",
    category: "Preview & Responsive",
    modifiers: ["mod"],
    key: char("p"),
  },
  {
    id: "breakpoints",
    title: "Switch Responsive Editing Mode",
    category: "Preview & Responsive",
    modifiers: ["mod"],
    key: char("b"),
    keywords: ["breakpoint", "mobile", "tablet", "desktop"],
  },
  {
    id: "frontend",
    title: "View on Frontend",
    category: "Preview & Responsive",
    modifiers: ["mod", "shift"],
    key: char("v"),
    keywords: ["live", "open page"],
  },

  // Other
  {
    id: "close-popup",
    title: "Close Popup",
    category: "Other",
    modifiers: [],
    key: special("esc"),
    note: "Templates, documentation and other popups.",
    keywords: ["cancel", "escape"],
  },
];
