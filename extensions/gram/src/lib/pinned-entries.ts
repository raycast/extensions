import { Entry } from "./entry";

/**
 * This file contains pure functions without Raycast dependencies for testability.
 */
export const PINNED_ENTRIES_CACHE_KEY = "pinnedEntries";

/**
 * Current format - uses `paths` array
 */
export interface PinnedEntry extends Entry {
  id: number;
  uri: string;
  paths: string[];
  title: string;
  subtitle: string;
  type: "local" | "remote";
  order: number;
  isOpen?: boolean;
  wsl?: { user: string | null; distro: string | null } | null;
}

export type PinnedEntries = Record<string, PinnedEntry>;
