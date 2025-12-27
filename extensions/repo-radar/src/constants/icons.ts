import { Icon } from "@raycast/api";

// ============================================
// Raycast Built-in Icons
// ============================================

export const Icons = {
  // Actions
  Plus: Icon.Plus,
  Pencil: Icon.Pencil,
  Trash: Icon.Trash,
  Check: Icon.Check,

  // Navigation / UI
  Document: Icon.Document,
  Folder: Icon.Folder,
  FolderOpen: Icon.Folder,
  ArrowSquareOut: Icon.ArrowNe,
  Minus: Icon.Minus,

  // Favorites
  Star: Icon.Star,
  StarFilled: Icon.Star,

  // Git
  GitBranch: Icon.Terminal,
  GitDiff: Icon.Document,

  // Status indicators
  Circle: Icon.Circle,
  CheckCircle: Icon.CheckCircle,
  WarningCircle: Icon.Warning,

  // Misc
  Copy: Icon.Clipboard,
  Link: Icon.Link,
  MagnifyingGlass: Icon.MagnifyingGlass,
  Finder: Icon.Finder,
} as const;
