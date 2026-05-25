// Shared types for the curated KNOWN_INSTALLS registry and the per-user
// override store. Lives in its own file so neither known-installs.ts nor
// user-known-installs.ts has to import from the other — breaks what was
// previously a circular dependency requiring a CommonJS require() hack.

export type KnownInstallKind = "brew-tap" | "mas" | "cask";

export interface KnownInstall {
  kind: KnownInstallKind;
  /** Shell commands to run, in order. */
  commands: string[];
  /** What the user sees in the UI. */
  description: string;
  /** For brew-tap / cask: the cask token after install. */
  caskToken?: string;
  /** For mas: the App Store ID. */
  masId?: number;
  /** Optional project homepage shown as a fallback when install fails. */
  homepageUrl?: string;
  /** When true, skip the install attempt entirely and direct the user to the homepage. */
  disabled?: boolean;
  /** Human-readable explanation shown to the user when `disabled` is true. */
  disabledReason?: string;
}
