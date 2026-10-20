export type ReviewState = "approved" | "changes_requested" | null;

// Approve and Request Changes are mutually exclusive on a PR, so this is a single
// per-PR state rather than two independent flags. Returns a new Map rather than
// mutating `current`, per this repo's immutability convention.
//
// A `null` value is stored (not deleted) — it means "explicitly cleared this
// session" (e.g. just unapproved), which must override stale real reviewer data
// fetched before the action ran. A key that was never touched has no map entry
// at all, which is what tells callers to fall back to real data instead.
export function setReviewState(
  current: Map<string, ReviewState>,
  key: string,
  value: ReviewState,
): Map<string, ReviewState> {
  const updated = new Map(current);
  updated.set(key, value);
  return updated;
}
