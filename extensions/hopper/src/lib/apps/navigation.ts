/**
 * Pure back/forward logic. No Raycast or macOS imports so it can be unit-tested with `node --test`.
 *
 * Model (browser-style):
 * - macOS already keeps apps in most-recently-used order (front to back). That list is our "history".
 * - The first Back takes a snapshot of that list and moves the cursor to index 1 (the previous app).
 * - Further Back/Forward walk the *snapshot*, so our own jumps don't reorder the history.
 * - If the user switches app by any other means (click, Cmd+Tab), the frontmost app no longer matches
 *   what we last jumped to, so the snapshot is discarded and the next Back starts fresh. This mirrors a
 *   browser dropping its forward stack when you navigate somewhere new.
 * - Toggle is a Back that always starts fresh, so repeating it flips between the two most recent apps.
 */

export type Direction = "back" | "forward" | "toggle";

export interface NavState {
  /** Bundle IDs, most recent first, captured on the first Back of a walk. */
  snapshot: string[];
  /** Index into `snapshot` of the app we last jumped to. */
  cursor: number;
}

export type NavResult =
  { ok: true; target: string; state: NavState } | { ok: false; reason: "no-apps" | "no-back" | "no-forward" };

/**
 * @param mru  bundle IDs of running apps, most recent first (mru[0] is frontmost)
 * @param prev state saved by the previous call, if any
 */
export function navigate(direction: Direction, mru: string[], prev?: NavState): NavResult {
  const current = mru[0];
  if (!current) return { ok: false, reason: "no-apps" };

  const continuing = direction !== "toggle" && prev !== undefined && prev.snapshot[prev.cursor] === current;
  const { snapshot, cursor } = continuing ? prev : { snapshot: mru, cursor: 0 };

  const running = new Set(mru);
  const step = direction === "forward" ? -1 : 1;
  let i = cursor + step;
  // Skip apps that quit since the snapshot was taken.
  while (i >= 0 && i < snapshot.length && !running.has(snapshot[i])) i += step;

  if (i < 0) return { ok: false, reason: "no-forward" };
  if (i >= snapshot.length) return { ok: false, reason: "no-back" };
  return { ok: true, target: snapshot[i], state: { snapshot, cursor: i } };
}
