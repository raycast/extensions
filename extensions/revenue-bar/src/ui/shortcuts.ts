import { Keyboard } from "@raycast/api";

/** Centralized like stripe's constants/keyboard-shortcuts.ts. Every choice is listed in docs/DECISIONS.md. */
export const SHORTCUTS = {
  /** ⌘R refresh (trustmrr, saasflow, stripe). */
  refresh: Keyboard.Shortcut.Common.Refresh,
  /** ⌘O open dashboard (datafast, paystack, trustmrr). */
  openDashboard: Keyboard.Shortcut.Common.Open,
  /**
   * ⌘⇧, preferences. The references use ⌘, but Raycast now reserves it and strips the prop at runtime
   * ("The `shortcut` prop provided to the Action `Open Extension Preferences` is reserved by Raycast"), so the
   * nearest unreserved chord is used instead.
   */
  preferences: { modifiers: ["cmd", "shift"], key: "," } as Keyboard.Shortcut,
  /** Copy ID (datafast, trustmrr use the common copy shortcut). */
  copy: Keyboard.Shortcut.Common.Copy,
  /** ⌘⇧E copy customer email (stripe). */
  copyEmail: { modifiers: ["cmd", "shift"], key: "e" } as Keyboard.Shortcut,
  /** ⌘⇧A copy amount (stripe). */
  copyAmount: { modifiers: ["cmd", "shift"], key: "a" } as Keyboard.Shortcut,
  /** ⌘⇧L manage license key (central-icons). */
  license: { modifiers: ["cmd", "shift"], key: "l" } as Keyboard.Shortcut,
  /** Destructive removal (autumn). */
  remove: Keyboard.Shortcut.Common.Remove,
} as const;
