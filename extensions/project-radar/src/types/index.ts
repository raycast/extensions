// ============================================
// Project Types
// ============================================

export type OpenMode = "ide" | "terminal" | "both";

export interface Project {
  id: string;
  alias: string;
  paths: string[];
  app: AppInfo;
  createdAt: number;
  updatedAt: number;
  // Feature: Favorites & Recent
  isFavorite?: boolean;
  lastOpenedAt?: number;
  // Feature: Groups
  group?: string;
  groupIcon?: string; // Icon value for custom groups
  // Feature: Terminal Support
  openMode?: OpenMode; // Default: "ide" for backwards compatibility
  terminal?: AppInfo; // Terminal app (optional)
  terminalCommand?: string; // Command to run in terminal (e.g., "claude", "codex")
}

// ============================================
// Application Types
// ============================================

export interface AppInfo {
  name: string;
  bundleId: string;
  path: string;
}

// ============================================
// Git Types
// ============================================

export interface GitStatus {
  isGitRepo: boolean;
  branch?: string;
  hasChanges?: boolean;
  ahead?: number;
  behind?: number;
}

// ============================================
// Component Props Types
// ============================================

export interface ProjectFormProps {
  project?: Project;
  groups?: string[];
  onSave: () => void;
}

// ============================================
// Launch Context Types
// ============================================

export interface OpenProjectContext {
  projectId: string;
}
