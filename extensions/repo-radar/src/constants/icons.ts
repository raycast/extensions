// ============================================
// Phosphor Icons (Local Assets)
// https://phosphoricons.com/
// ============================================

// Helper to reference local icon
function icon(name: string): string {
  return `icons/${name}.svg`;
}

// ============================================
// Icon Definitions
// ============================================

export const Icons = {
  // Actions
  Plus: icon("plus"),
  Pencil: icon("pencil-simple"),
  Trash: icon("trash"),
  Check: icon("check"),

  // Navigation / UI
  Document: icon("file-text"),
  Folder: icon("folder"),
  FolderOpen: icon("folder-open"),
  ArrowSquareOut: icon("arrow-square-out"),
  Minus: icon("minus"),

  // Favorites
  Star: icon("star"),
  StarFilled: icon("star-fill"),

  // Git
  GitBranch: icon("git-branch"),
  GitDiff: icon("git-diff"),

  // Status indicators
  Circle: icon("circle-fill"),
  CheckCircle: icon("check-circle-fill"),
  WarningCircle: icon("warning-circle-fill"),

  // Misc
  Copy: icon("copy"),
  Link: icon("link"),
  MagnifyingGlass: icon("magnifying-glass"),
  Finder: icon("folder-open"),
} as const;
