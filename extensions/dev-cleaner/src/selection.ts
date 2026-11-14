import type { CleanupCandidate } from "./types";

/** Which untouched candidates are selected when a scan finishes. High-risk candidates are never preselected. */
export type PreselectLevel = "off" | "recommended" | "safe" | "review";

export function isPreselected(candidate: CleanupCandidate, level: PreselectLevel): boolean {
  if (level === "recommended") return candidate.selectedByDefault;
  if (level === "safe") return candidate.risk === "safe";
  if (level === "review") return candidate.risk !== "high";
  return false;
}

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
 * keep their current state; untouched candidates are selected according to `level`. Kept and vanished candidates are
 * dropped.
 */
export function mergeScanSelection(
  current: ReadonlySet<string>,
  candidates: readonly CleanupCandidate[],
  keptIds: ReadonlySet<string>,
  touches: SelectionTouches,
  level: PreselectLevel = "recommended",
): Set<string> {
  const next = new Set<string>();
  for (const candidate of candidates) {
    if (keptIds.has(candidate.id)) continue;
    const touched = touches.all || touches.ids.has(candidate.id);
    if (touched ? current.has(candidate.id) : isPreselected(candidate, level)) next.add(candidate.id);
  }
  return next;
}
