import { Icon } from "@raycast/api";

// ============================================
// Raycast Built-in Icons
// ============================================

/**
 * Centralized icon mappings for consistent usage across the app.
 * Using semantic names that describe purpose, not appearance.
 */
export const Icons = {
  // Actions
  Plus: Icon.Plus,
  Pencil: Icon.Pencil,
  Trash: Icon.Trash,
  Check: Icon.Check,

  // Navigation / UI
  Document: Icon.Document,
  Folder: Icon.Folder,
  ArrowSquareOut: Icon.ArrowNe,
  Minus: Icon.Minus,

  // Favorites
  Star: Icon.Star,

  // Git
  GitBranch: Icon.Terminal,

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
