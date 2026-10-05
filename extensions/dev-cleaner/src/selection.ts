import type { CleanupCandidate } from "./types";

/** Selection changes the user made while a scan was still streaming results. */
export interface SelectionTouches {
  /** A preset or Clear Selection replaced the whole selection. */
  all: boolean;
  /** Candidates the user selected or unselected individually. */
  ids: Set<string>;
}

export function emptySelectionTouches(): SelectionTouches {
  return { all: false, ids: new Set() };
}

/**
 * Combines the user's in-progress selection with default selections once a scan finishes. Candidates the user touched
 * keep their current state; untouched candidates fall back to their default. Kept and vanished candidates are dropped.
 */
export function mergeScanSelection(
  current: ReadonlySet<string>,
  candidates: readonly CleanupCandidate[],
  keptIds: ReadonlySet<string>,
  touches: SelectionTouches,
): Set<string> {
  const next = new Set<string>();
  for (const candidate of candidates) {
    if (keptIds.has(candidate.id)) continue;
    const touched = touches.all || touches.ids.has(candidate.id);
    if (touched ? current.has(candidate.id) : candidate.selectedByDefault) next.add(candidate.id);
  }
  return next;
}
