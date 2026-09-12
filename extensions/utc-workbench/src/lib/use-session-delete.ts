import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import type { SessionId, SessionState } from "../types";
import { createDraftSession, deleteSession } from "./sessions";

type SessionStateSetter = (updater: (state: SessionState) => SessionState) => void;

/**
 * Shared cache key used to forward a delete request from a pushed
 * view (like `SessionPicker`) to its always-mounted parent (the main
 * `UTCWorkbench` list), so the actual delete runs while the parent
 * is foregrounded. See the hook comments below.
 */
const DELETE_REQUEST_CACHE_KEY = "utc-workbench-pending-session-delete-v1";

/**
 * Short deferral used by `useRequestSessionDelete` to push the cache
 * write past Raycast's pop transition. Needs to be non-zero: when the
 * picker calls `pop()` and immediately writes to the cache, the main
 * view is still backgrounded at the moment the subscription fires,
 * which puts us right back in the ghost-row code path. A small
 * wall-clock delay lets Raycast finish the presentation swap so phase
 * 1 lands foregrounded.
 */
const POP_THEN_SIGNAL_DELAY_MS = 50;

/**
 * Mounts effects that handle the two-phase session-delete pattern,
 * including cross-view requests from pushed child views. This hook
 * **must** be mounted in the always-foregrounded parent view
 * (`UTCWorkbench`); pushed views use `useRequestSessionDelete` below
 * to forward requests here.
 *
 * **Why two phases?** Raycast bridges React to native AppKit
 * asynchronously. The native `<List>` widget maintains its own
 * internal selection state, and removing the currently-selected row
 * from the children tree while the widget is presented triggers a
 * "ghost row" — the widget retains a visual copy of the deleted row.
 * (Related: Raycast API changelog entries 1.53.0, 1.63.0, 1.84.0
 * and open issue raycast/extensions#8622 document related races in
 * the same native bridge.)
 *
 * By splitting into two React commits we route through the widget's
 * working "children tree replaced wholesale" path instead of its
 * broken "selected item removed" path:
 *
 *   - Phase 1 (cross-view effect below): swap the active session to
 *     a fresh draft via `createDraftSession`. The old session stays
 *     in state — only the active pointer changes. The widget sees a
 *     tree swap, not a row deletion.
 *   - Phase 2 (local effect below): once `activeSessionId` has moved
 *     off the pending id, purge the orphaned session. No rendered
 *     impact since it was already inactive.
 *
 * Phase 1 must run while this view is foregrounded. Running it while
 * backgrounded (e.g., from a pushed picker view) still produces the
 * ghost — the widget only processes the update cleanly when it is the
 * presented view.
 */
export function useSessionDelete(
  activeSessionId: SessionId | null,
  setSessionState: SessionStateSetter
): (id: SessionId) => void {
  const [pendingDeleteId, setPendingDeleteId] = useState<SessionId | null>(null);
  const [deleteRequest, setDeleteRequest] = useCachedState<SessionId | null>(DELETE_REQUEST_CACHE_KEY, null);

  // Phase 2: fires on the render after phase 1 has committed. When
  // `active` has moved off the pending id, the widget has already
  // reconciled the children-tree swap, so purging the orphaned
  // session in a second commit has no rendered impact.
  useEffect(() => {
    if (pendingDeleteId !== null && activeSessionId !== pendingDeleteId) {
      setSessionState((s) => deleteSession(s, pendingDeleteId));
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, activeSessionId, setSessionState]);

  // Cross-view request handler. A pushed view (SessionPicker) writes
  // a session id to the shared cache key after popping; when the
  // cache update arrives here, this view is the foremost view, so
  // phase 1 lands foregrounded. The request is cleared immediately.
  useEffect(() => {
    if (deleteRequest === null) return;
    const id = deleteRequest;
    setDeleteRequest(null);
    if (activeSessionId !== id) {
      // Non-active: safe to delete atomically. No rendered rows for
      // the native widget to mishandle.
      setSessionState((s) => deleteSession(s, id));
    } else {
      // Active: phase 1 — swap to a draft. Phase 2 will fire from
      // the effect above on the next render cycle.
      setSessionState((s) => createDraftSession(s));
      setPendingDeleteId(id);
    }
  }, [deleteRequest, activeSessionId, setSessionState, setDeleteRequest]);

  // Returned for use by the foregrounded main view's own actions
  // (e.g., ⌃⇧⌫ "Delete Session"). Pushed views must NOT call this
  // — they should use `useRequestSessionDelete` below.
  return function deleteSessionSafely(id: SessionId) {
    if (activeSessionId !== id) {
      setSessionState((s) => deleteSession(s, id));
      return;
    }
    setSessionState((s) => createDraftSession(s));
    setPendingDeleteId(id);
  };
}

/**
 * Companion hook for pushed child views (like `SessionPicker`) to
 * request a session delete that will be executed by the always-
 * mounted parent view once it is foregrounded. Returns a function
 * `(id, pop) => void`:
 *
 *   - `pop` is the caller's `useNavigation().pop` function. The
 *     request hook calls it first, then schedules the cache write
 *     after a short delay so phase 1 lands on the foregrounded
 *     parent view rather than in the background.
 *   - `id` is the session to delete; active/non-active branching is
 *     handled on the parent side.
 *
 * Callers must not also call the parent's delete handler directly —
 * the whole point is to forward the work out of the pushed view's
 * context.
 */
export function useRequestSessionDelete(): (id: SessionId, pop: () => void) => void {
  const [, setDeleteRequest] = useCachedState<SessionId | null>(DELETE_REQUEST_CACHE_KEY, null);
  return (id, pop) => {
    pop();
    // Defer the cache write until Raycast has finished swapping the
    // presentation back to the parent view. See POP_THEN_SIGNAL_DELAY_MS.
    setTimeout(() => {
      setDeleteRequest(id);
    }, POP_THEN_SIGNAL_DELAY_MS);
  };
}
