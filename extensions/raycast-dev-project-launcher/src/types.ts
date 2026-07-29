/**
 * Shared type definitions for the Dev Project Launcher extension.
 */

/**
 * The set of project types the extension knows how to fingerprint out of the box.
 * "generic" is used whenever a directory looks like a project (contains a VCS
 * marker or was found at the configured scan depth) but no more specific
 * marker file could be matched. "unknown" is never assigned to a scanned
 * project — it exists only as a safe fallback key for the app-path store.
 */
export type BuiltinProjectType =
  | "xcode"
  | "swift-package"
  | "android-gradle"
  | "kotlin-gradle"
  | "node"
  | "typescript"
  | "python"
  | "rust"
  | "go"
  | "java-maven"
  | "flutter"
  | "ruby"
  | "generic"
  | "unknown";

/**
 * Project types are represented as plain strings (not the union above) so that
 * users can register brand-new, custom project types from the "Manage App
 * Paths" command without touching source code.
 */
export type ProjectType = BuiltinProjectType | string;

export interface ProjectEntity {
  /** Folder name, used as the display title. */
  name: string;
  /** Absolute, tilde-expanded path to the project directory. */
  path: string;
  /** Detected project type, used to resolve icons and app-path mappings. */
  type: ProjectType;
  /** Human readable label for the detected type, e.g. "Xcode Project". */
  typeLabel: string;
  /** Last modification time of the directory, used for sorting. */
  lastModified: number;
  /** Root directory (from preferences) this project was discovered under. */
  sourceRoot: string;
  /** True if a `.git` directory was found inside the project. */
  isGitRepo: boolean;
}

/** Per-project-type editor application path mapping. */
export interface AppPathMapping {
  /** App used by the primary "Open" action — the natural tool for this project type. */
  preferred?: string;
  vscode?: string;
  webstorm?: string;
  iterm?: string;
}

/** The full persisted preferences document, keyed by ProjectType. */
export type AppPathStore = Record<string, AppPathMapping>;

export type EditorTarget = "preferred" | "vscode" | "webstorm" | "iterm";
