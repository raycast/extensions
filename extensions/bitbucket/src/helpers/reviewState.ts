export type ReviewState = "approved" | "changes_requested" | null;

// Approve and Request Changes are mutually exclusive on a PR, so this is a single
// per-PR state rather than two independent flags. Returns a new Map rather than
// mutating `current`, per this repo's immutability convention.
export function setReviewState(
  current: Map<string, ReviewState>,
  key: string,
  value: ReviewState,
): Map<string, ReviewState> {
  const updated = new Map(current);
  if (value === null) {
    updated.delete(key);
  } else {
    updated.set(key, value);
  }
  return updated;
}
