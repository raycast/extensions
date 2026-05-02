/**
 * @module pages/tag-browser/state
 *
 * Pure state-to-view mapper for the tag browser page.
 * Owns all UI copy strings so the page component never hard-codes text.
 */

import type { Color } from "@raycast/api";

import type { FinderTag } from "$lib/types";
import { resolveFinderTagColor } from "./finder-tags";

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export type TagBrowserPhase = "loading-tags" | "loading-items" | "ready";

export type TagBrowserState = {
  /** Current UI phase. */
  phase: TagBrowserPhase;
  /** All available tags, or `null` when tag-list loading failed. */
  tags: FinderTag[] | null;
  /** The currently selected tag name, or `null`. */
  selectedTag: string | null;
  /** Items for the selected tag, or `null` when item-query failed. */
  items: unknown[] | null;
  /** Whether tag-list loading errored. */
  tagListError: boolean;
  /** Whether tag-item querying errored. */
  tagQueryError: boolean;
};

export type TagBrowserViewState = {
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
};

// ---------------------------------------------------------------------------
// Pure helper
// ---------------------------------------------------------------------------

/**
 * Derive the UI view state (placeholder text, empty-view copy) from the
 * current tag-browser state. Pure function — no side effects.
 */
export function buildTagBrowserState(state: TagBrowserState): TagBrowserViewState {
  if (state.tagListError) {
    return {
      searchBarPlaceholder: "Search Tags",
      emptyTitle: "Failed to Load Finder Tags",
      emptyDescription: "",
    };
  }

  if (state.tagQueryError) {
    return {
      searchBarPlaceholder: "Search Tags",
      emptyTitle: "Failed to Load Tagged Items",
      emptyDescription: "",
    };
  }

  if (state.tags !== null && state.tags.length === 0) {
    return {
      searchBarPlaceholder: "Search Tags",
      emptyTitle: "No Finder Tags",
      emptyDescription: "Create a Finder tag in Finder, then reopen Browse Tags.",
    };
  }

  if (state.selectedTag && state.items !== null && state.items.length === 0) {
    return {
      searchBarPlaceholder: "Search Tags",
      emptyTitle: `No Results for "${state.selectedTag}"`,
      emptyDescription: "No indexed items currently match this Finder tag.",
    };
  }

  return {
    searchBarPlaceholder: "Search Tags",
    emptyTitle: "No Finder Tags",
    emptyDescription: "Create a Finder tag in Finder, then reopen Browse Tags.",
  };
}

// ---------------------------------------------------------------------------
// Colour helper (re-exported for page convenience)
// ---------------------------------------------------------------------------

/**
 * Resolve a tag's display colour, falling back to the neutral entry at
 * index 0 when `colorIndex` is absent or out of bounds.
 */
export function resolveTagColor(tag: FinderTag): Color {
  return resolveFinderTagColor(tag.colorIndex);
}
