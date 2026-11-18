export type RiskLevel = "safe" | "moderate";

export type ScanCategory = "package-caches" | "build-artifacts" | "xcode" | "containers" | "language-caches" | "system";

/**
 * How to clean this item:
 * - "rmrf": safe to `rm -rf` the path directly
 * - "command": must run a specific tool command (e.g. `npm cache clean --force`, `docker image prune`)
 */
export type CleanAction = { type: "rmrf" } | { type: "command"; command: string; args: string[] };

export interface ScanResult {
  id: string;
  title: string;
  description: string;
  category: ScanCategory;
  /** Filesystem path (for display and rm -rf). For "command" cleanAction, this is informational only. */
  path: string;
  size: number;
  itemCount?: number;
  risk: RiskLevel;
  available: boolean;
  /** Shell command string shown to the user (for clipboard copy) */
  cleanCommand: string;
  /** How to actually clean this item */
  cleanAction: CleanAction;
  requiresTool?: string;
  icon: string;
}

export const CATEGORY_META: Record<ScanCategory, { title: string; icon: string }> = {
  "package-caches": { title: "Package Manager Caches", icon: "box" },
  "build-artifacts": { title: "Build Artifacts & Dependencies", icon: "hammer" },
  xcode: { title: "Xcode & iOS", icon: "app-window" },
  containers: { title: "Containers", icon: "hard-drive" },
  "language-caches": { title: "Language Caches", icon: "code" },
  system: { title: "System Caches & Logs", icon: "gear" },
};
