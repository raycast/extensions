import type { DiscoveryOptions } from "../filesystem/discovery";

/** Which editor the default "Open" action uses. */
export type EditorId = "vscode" | "cursor";

/**
 * Raw preference values exactly as Raycast delivers them (all strings/booleans),
 * matching the `preferences` block in package.json. Kept separate from the
 * resolved shape so parsing is a pure, testable transformation.
 */
export interface RawPreferences {
  readonly searchRoots?: string;
  readonly maxDepth?: string;
  readonly ignoredDirectories?: string;
  readonly followSymlinks?: boolean;
  readonly includeBareRepos?: boolean;
  readonly primaryEditor?: string;
  readonly terminalApp?: string;
}

/** Fully-resolved, validated preferences consumed by the rest of the app. */
export interface ResolvedPreferences {
  /** Discovery configuration ready to hand to the indexer. */
  readonly discovery: Omit<DiscoveryOptions, "onDiscover" | "signal">;
  /** Editor used by the primary open action. */
  readonly primaryEditor: EditorId;
  /** Terminal application bundle/app name for the terminal action. */
  readonly terminalApp: string;
}
