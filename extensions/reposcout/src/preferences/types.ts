import type { DiscoveryOptions } from "../filesystem/discovery";

/**
 * Which editor the default "Open" action uses. This mirrors the `primaryEditor`
 * dropdown values in the manifest, which Raycast exposes as the generated
 * `Preferences["primaryEditor"]` type.
 */
export type EditorId = "vscode" | "cursor";

/** Fully-resolved, validated preferences consumed by the rest of the app. */
export interface ResolvedPreferences {
  /** Discovery configuration ready to hand to the indexer. */
  readonly discovery: Omit<DiscoveryOptions, "onDiscover" | "signal">;
  /** Editor used by the primary open action. */
  readonly primaryEditor: EditorId;
  /** Terminal application bundle/app name for the terminal action. */
  readonly terminalApp: string;
}
