export type Platform = "macOS" | "Windows" | "Linux";

export interface Shortcut {
  title: string;
  keys: Record<Platform, string>;
  category: string;
}

export const CATEGORIES = [
  "Essential",
  "Tools",
  "View",
  "Zoom",
  "Text",
  "Shape",
  "Selection",
  "Components",
  "Arrange",
  "Transform",
  "Export",
] as const;

export const shortcuts: Shortcut[] = [
  // Essential
  { title: "Undo", keys: { macOS: "⌘ Z", Windows: "Ctrl Z", Linux: "Ctrl Z" }, category: "Essential" },
  { title: "Redo", keys: { macOS: "⌘ ⇧ Z", Windows: "Ctrl Shift Z", Linux: "Ctrl Shift Z" }, category: "Essential" },
  { title: "Copy", keys: { macOS: "⌘ C", Windows: "Ctrl C", Linux: "Ctrl C" }, category: "Essential" },
  { title: "Cut", keys: { macOS: "⌘ X", Windows: "Ctrl X", Linux: "Ctrl X" }, category: "Essential" },
  { title: "Paste", keys: { macOS: "⌘ V", Windows: "Ctrl V", Linux: "Ctrl V" }, category: "Essential" },
  { title: "Paste to replace", keys: { macOS: "⌘ ⇧ R", Windows: "Ctrl Shift R", Linux: "Ctrl Shift R" }, category: "Essential" },
  { title: "Duplicate", keys: { macOS: "⌘ D", Windows: "Ctrl D", Linux: "Ctrl D" }, category: "Essential" },
  { title: "Delete", keys: { macOS: "⌫", Windows: "Del", Linux: "Del" }, category: "Essential" },
  { title: "Select all", keys: { macOS: "⌘ A", Windows: "Ctrl A", Linux: "Ctrl A" }, category: "Essential" },
  { title: "Save", keys: { macOS: "⌘ S", Windows: "Ctrl S", Linux: "Ctrl S" }, category: "Essential" },
  { title: "Open preferences", keys: { macOS: "⌘ ,", Windows: "Ctrl ,", Linux: "Ctrl ," }, category: "Essential" },
  { title: "Quick actions", keys: { macOS: "⌘ /", Windows: "Ctrl /", Linux: "Ctrl /" }, category: "Essential" },

  // Tools
  { title: "Move tool", keys: { macOS: "V", Windows: "V", Linux: "V" }, category: "Tools" },
  { title: "Frame tool", keys: { macOS: "F", Windows: "F", Linux: "F" }, category: "Tools" },
  { title: "Pen tool", keys: { macOS: "P", Windows: "P", Linux: "P" }, category: "Tools" },
  { title: "Pencil tool", keys: { macOS: "⇧ P", Windows: "Shift P", Linux: "Shift P" }, category: "Tools" },
  { title: "Text tool", keys: { macOS: "T", Windows: "T", Linux: "T" }, category: "Tools" },
  { title: "Rectangle tool", keys: { macOS: "R", Windows: "R", Linux: "R" }, category: "Tools" },
  { title: "Ellipse tool", keys: { macOS: "O", Windows: "O", Linux: "O" }, category: "Tools" },
  { title: "Line tool", keys: { macOS: "L", Windows: "L", Linux: "L" }, category: "Tools" },
  { title: "Arrow tool", keys: { macOS: "⇧ L", Windows: "Shift L", Linux: "Shift L" }, category: "Tools" },
  { title: "Hand tool (pan)", keys: { macOS: "H", Windows: "H", Linux: "H" }, category: "Tools" },
  { title: "Comment tool", keys: { macOS: "C", Windows: "C", Linux: "C" }, category: "Tools" },
  { title: "Scale tool", keys: { macOS: "K", Windows: "K", Linux: "K" }, category: "Tools" },
  { title: "Slice tool", keys: { macOS: "S", Windows: "S", Linux: "S" }, category: "Tools" },

  // View
  { title: "Show/hide rulers", keys: { macOS: "⇧ R", Windows: "Shift R", Linux: "Shift R" }, category: "View" },
  { title: "Show/hide grid", keys: { macOS: "⌃ G", Windows: "Ctrl Shift 4", Linux: "Ctrl Shift 4" }, category: "View" },
  { title: "Show/hide layout grid", keys: { macOS: "⌃ G", Windows: "Ctrl G", Linux: "Ctrl G" }, category: "View" },
  { title: "Show/hide pixel grid", keys: { macOS: "⌘ '", Windows: "Ctrl '", Linux: "Ctrl '" }, category: "View" },
  { title: "Show/hide UI", keys: { macOS: "⌘ \\", Windows: "Ctrl \\", Linux: "Ctrl \\" }, category: "View" },
  { title: "Multiplayer cursors", keys: { macOS: "⌥ ⌘ \\", Windows: "Alt Ctrl \\", Linux: "Alt Ctrl \\" }, category: "View" },
  { title: "Outlines mode", keys: { macOS: "⌘ Y", Windows: "Ctrl Y", Linux: "Ctrl Y" }, category: "View" },
  { title: "Pixel preview", keys: { macOS: "⌃ P", Windows: "Ctrl Shift P", Linux: "Ctrl Shift P" }, category: "View" },
  { title: "Full screen", keys: { macOS: "⌃ ⌘ F", Windows: "F11", Linux: "F11" }, category: "View" },

  // Zoom
  { title: "Zoom in", keys: { macOS: "⌘ +", Windows: "Ctrl +", Linux: "Ctrl +" }, category: "Zoom" },
  { title: "Zoom out", keys: { macOS: "⌘ -", Windows: "Ctrl -", Linux: "Ctrl -" }, category: "Zoom" },
  { title: "Zoom to fit page", keys: { macOS: "⇧ 1", Windows: "Shift 1", Linux: "Shift 1" }, category: "Zoom" },
  { title: "Zoom to fit selection", keys: { macOS: "⇧ 2", Windows: "Shift 2", Linux: "Shift 2" }, category: "Zoom" },
  { title: "Zoom to actual size (100%)", keys: { macOS: "⌘ 0", Windows: "Ctrl 0", Linux: "Ctrl 0" }, category: "Zoom" },
  { title: "Zoom to 50%", keys: { macOS: "⌘ 5", Windows: "Ctrl 5", Linux: "Ctrl 5" }, category: "Zoom" },
  { title: "Previous page", keys: { macOS: "Page Up", Windows: "Page Up", Linux: "Page Up" }, category: "Zoom" },
  { title: "Next page", keys: { macOS: "Page Down", Windows: "Page Down", Linux: "Page Down" }, category: "Zoom" },
  { title: "Find previous frame", keys: { macOS: "⌘ ← / ↑", Windows: "Ctrl ← / ↑", Linux: "Ctrl ← / ↑" }, category: "Zoom" },
  { title: "Find next frame", keys: { macOS: "⌘ → / ↓", Windows: "Ctrl → / ↓", Linux: "Ctrl → / ↓" }, category: "Zoom" },

  // Text
  { title: "Bold", keys: { macOS: "⌘ B", Windows: "Ctrl B", Linux: "Ctrl B" }, category: "Text" },
  { title: "Italic", keys: { macOS: "⌘ I", Windows: "Ctrl I", Linux: "Ctrl I" }, category: "Text" },
  { title: "Underline", keys: { macOS: "⌘ U", Windows: "Ctrl U", Linux: "Ctrl U" }, category: "Text" },
  { title: "Strikethrough", keys: { macOS: "⇧ ⌘ X", Windows: "Ctrl Shift X", Linux: "Ctrl Shift X" }, category: "Text" },
  { title: "Increase font size", keys: { macOS: "⌘ ⇧ >", Windows: "Ctrl Shift >", Linux: "Ctrl Shift >" }, category: "Text" },
  { title: "Decrease font size", keys: { macOS: "⌘ ⇧ <", Windows: "Ctrl Shift <", Linux: "Ctrl Shift <" }, category: "Text" },
  { title: "Increase line height", keys: { macOS: "⌥ ⇧ >", Windows: "Alt Shift >", Linux: "Alt Shift >" }, category: "Text" },
  { title: "Decrease line height", keys: { macOS: "⌥ ⇧ <", Windows: "Alt Shift <", Linux: "Alt Shift <" }, category: "Text" },
  { title: "Increase letter spacing", keys: { macOS: "⌥ >", Windows: "Alt >", Linux: "Alt >" }, category: "Text" },
  { title: "Decrease letter spacing", keys: { macOS: "⌥ <", Windows: "Alt <", Linux: "Alt <" }, category: "Text" },
  { title: "Align text left", keys: { macOS: "⌥ ⌘ L", Windows: "Ctrl Alt L", Linux: "Ctrl Alt L" }, category: "Text" },
  { title: "Align text center", keys: { macOS: "⌥ ⌘ T", Windows: "Ctrl Alt T", Linux: "Ctrl Alt T" }, category: "Text" },
  { title: "Align text right", keys: { macOS: "⌥ ⌘ R", Windows: "Ctrl Alt R", Linux: "Ctrl Alt R" }, category: "Text" },
  { title: "Align text justified", keys: { macOS: "⌥ ⌘ J", Windows: "Ctrl Alt J", Linux: "Ctrl Alt J" }, category: "Text" },

  // Shape
  { title: "Union selection", keys: { macOS: "⌥ ⌘ U", Windows: "Ctrl Alt U", Linux: "Ctrl Alt U" }, category: "Shape" },
  { title: "Subtract selection", keys: { macOS: "⌥ ⌘ S", Windows: "Ctrl Alt S", Linux: "Ctrl Alt S" }, category: "Shape" },
  { title: "Intersect selection", keys: { macOS: "⌥ ⌘ I", Windows: "Ctrl Alt I", Linux: "Ctrl Alt I" }, category: "Shape" },
  { title: "Exclude selection", keys: { macOS: "⌥ ⌘ X", Windows: "Ctrl Alt X", Linux: "Ctrl Alt X" }, category: "Shape" },
  { title: "Flatten selection", keys: { macOS: "⌘ E", Windows: "Ctrl E", Linux: "Ctrl E" }, category: "Shape" },
  { title: "Use as mask", keys: { macOS: "⌃ ⌘ M", Windows: "Ctrl Alt M", Linux: "Ctrl Alt M" }, category: "Shape" },

  // Selection
  { title: "Select all in frame", keys: { macOS: "⌘ A", Windows: "Ctrl A", Linux: "Ctrl A" }, category: "Selection" },
  { title: "Select inverse", keys: { macOS: "⌘ ⇧ A", Windows: "Ctrl Shift A", Linux: "Ctrl Shift A" }, category: "Selection" },
  { title: "Group selection", keys: { macOS: "⌘ G", Windows: "Ctrl G", Linux: "Ctrl G" }, category: "Selection" },
  { title: "Ungroup selection", keys: { macOS: "⌘ ⇧ G", Windows: "Ctrl Shift G", Linux: "Ctrl Shift G" }, category: "Selection" },
  { title: "Frame selection", keys: { macOS: "⌥ ⌘ G", Windows: "Ctrl Alt G", Linux: "Ctrl Alt G" }, category: "Selection" },
  { title: "Select parent", keys: { macOS: "Esc", Windows: "Esc", Linux: "Esc" }, category: "Selection" },
  { title: "Select child", keys: { macOS: "↩", Windows: "Enter", Linux: "Enter" }, category: "Selection" },
  { title: "Select next sibling", keys: { macOS: "Tab", Windows: "Tab", Linux: "Tab" }, category: "Selection" },
  { title: "Select previous sibling", keys: { macOS: "⇧ Tab", Windows: "Shift Tab", Linux: "Shift Tab" }, category: "Selection" },
  { title: "Deep select", keys: { macOS: "⌘ click", Windows: "Ctrl click", Linux: "Ctrl click" }, category: "Selection" },

  // Components
  { title: "Create component", keys: { macOS: "⌥ ⌘ K", Windows: "Ctrl Alt K", Linux: "Ctrl Alt K" }, category: "Components" },
  { title: "Detach instance", keys: { macOS: "⌥ ⌘ B", Windows: "Ctrl Alt B", Linux: "Ctrl Alt B" }, category: "Components" },
  { title: "Go to main component", keys: { macOS: "⌥ ⌘ ↩", Windows: "Ctrl Alt Enter", Linux: "Ctrl Alt Enter" }, category: "Components" },
  { title: "Reset instance", keys: { macOS: "⌥ ⌘ ⌫", Windows: "Ctrl Alt Del", Linux: "Ctrl Alt Del" }, category: "Components" },
  { title: "Toggle show variants", keys: { macOS: "⌥ ⇧ K", Windows: "Alt Shift K", Linux: "Alt Shift K" }, category: "Components" },

  // Arrange
  { title: "Bring to front", keys: { macOS: "⌘ ]", Windows: "Ctrl ]", Linux: "Ctrl ]" }, category: "Arrange" },
  { title: "Send to back", keys: { macOS: "⌘ [", Windows: "Ctrl [", Linux: "Ctrl [" }, category: "Arrange" },
  { title: "Bring forward", keys: { macOS: "⌘ ⌥ ]", Windows: "Ctrl Alt ]", Linux: "Ctrl Alt ]" }, category: "Arrange" },
  { title: "Send backward", keys: { macOS: "⌘ ⌥ [", Windows: "Ctrl Alt [", Linux: "Ctrl Alt [" }, category: "Arrange" },
  { title: "Align left", keys: { macOS: "⌥ A", Windows: "Alt A", Linux: "Alt A" }, category: "Arrange" },
  { title: "Align right", keys: { macOS: "⌥ D", Windows: "Alt D", Linux: "Alt D" }, category: "Arrange" },
  { title: "Align top", keys: { macOS: "⌥ W", Windows: "Alt W", Linux: "Alt W" }, category: "Arrange" },
  { title: "Align bottom", keys: { macOS: "⌥ S", Windows: "Alt S", Linux: "Alt S" }, category: "Arrange" },
  { title: "Align center horizontally", keys: { macOS: "⌥ H", Windows: "Alt H", Linux: "Alt H" }, category: "Arrange" },
  { title: "Align center vertically", keys: { macOS: "⌥ V", Windows: "Alt V", Linux: "Alt V" }, category: "Arrange" },
  { title: "Distribute horizontal spacing", keys: { macOS: "⌃ ⌥ H", Windows: "Ctrl Alt Shift H", Linux: "Ctrl Alt Shift H" }, category: "Arrange" },
  { title: "Distribute vertical spacing", keys: { macOS: "⌃ ⌥ V", Windows: "Ctrl Alt Shift V", Linux: "Ctrl Alt Shift V" }, category: "Arrange" },
  { title: "Tidy up", keys: { macOS: "⌃ ⌥ T", Windows: "Ctrl Alt T", Linux: "Ctrl Alt T" }, category: "Arrange" },

  // Transform
  { title: "Flip horizontal", keys: { macOS: "⇧ H", Windows: "Shift H", Linux: "Shift H" }, category: "Transform" },
  { title: "Flip vertical", keys: { macOS: "⇧ V", Windows: "Shift V", Linux: "Shift V" }, category: "Transform" },
  { title: "Resize proportionally", keys: { macOS: "⇧ drag", Windows: "Shift drag", Linux: "Shift drag" }, category: "Transform" },
  { title: "Resize from center", keys: { macOS: "⌥ drag", Windows: "Alt drag", Linux: "Alt drag" }, category: "Transform" },
  { title: "Move by 1px", keys: { macOS: "Arrow keys", Windows: "Arrow keys", Linux: "Arrow keys" }, category: "Transform" },
  { title: "Move by 10px", keys: { macOS: "⇧ Arrow keys", Windows: "Shift Arrow keys", Linux: "Shift Arrow keys" }, category: "Transform" },

  // Export
  { title: "Export selected", keys: { macOS: "⌘ ⇧ E", Windows: "Ctrl Shift E", Linux: "Ctrl Shift E" }, category: "Export" },
  { title: "Copy as PNG", keys: { macOS: "⌃ ⇧ C", Windows: "Ctrl Shift C", Linux: "Ctrl Shift C" }, category: "Export" },
  { title: "Copy as SVG", keys: { macOS: "⌃ ⇧ V", Windows: "Ctrl Shift V", Linux: "Ctrl Shift V" }, category: "Export" },
];
