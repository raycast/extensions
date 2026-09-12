import { randomUUID } from "node:crypto";
import type { Event, Session, SessionId, SessionState } from "../types";

/**
 * Pure transforms over `SessionState`. Persistence is owned by the
 * component via `useLocalStorage`; this module knows nothing about
 * Raycast storage APIs, which keeps every helper trivially testable.
 *
 * Invariant (preserved by every transform in this file): `activeSessionId`
 * is null iff `sessions` is empty; otherwise it is a key that exists in
 * `sessions`.
 *
 * Draft sessions: a session with `createdAt === null` is a "draft" —
 * it exists so there is always an active session to render (required
 * by the two-phase session-delete pattern in `use-session-delete.ts`),
 * but it has not yet earned a creation timestamp. Drafts are promoted
 * to real sessions on the first event mutation OR on rename, at which
 * point `createdAt` is stamped with `Date.now()`.
 */

const DRAFT_SESSION_LABEL = "Untitled Session";

export const SESSIONS_STORAGE_KEY = "utc-workbench-sessions-v3";

export const EMPTY_SESSION_STATE: SessionState = {
  activeSessionId: null,
  sessions: {},
};

/** Resolve the currently active session, or null when none exists. */
export function getActiveSession(state: SessionState): Session | null {
  if (state.activeSessionId === null) return null;
  return state.sessions[state.activeSessionId] ?? null;
}

/**
 * Return committed sessions ordered for display in the picker: the
 * active session first, then the rest sorted most-recently-created
 * first. Draft sessions are filtered out entirely — they exist purely
 * to keep Raycast's `<List>` from crossing the zero-children boundary
 * (see `use-session-delete.ts`) and are not meaningful user artifacts.
 *
 * Putting the active session at the top means Raycast's default
 * "select the first item" behavior lands focus on the current session
 * whenever the picker opens, without needing the finicky
 * `selectedItemId` prop. It also reinforces the visual "you are here"
 * signal above the existing icon-color cue. When the active session
 * is a draft, no row is highlighted as active — which correctly
 * reflects "you're in a transient state, pick or create one".
 */
export function listSessions(state: SessionState): readonly Session[] {
  const committed = Object.values(state.sessions)
    .filter((s) => !isDraftSession(s))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const activeId = state.activeSessionId;
  if (activeId === null) return committed;
  // Partition in one pass — avoids the index/non-null-assertion dance
  // that the lint rule against non-null assertions pushes back on.
  const active: Session[] = [];
  const rest: Session[] = [];
  for (const session of committed) {
    (session.id === activeId ? active : rest).push(session);
  }
  return [...active, ...rest];
}

/**
 * If the currently active session is a draft, remove it from state.
 * Used by any transition that navigates *away* from a draft (switching
 * to another session, creating a named session) — drafts are ephemeral
 * by definition and should not linger after the user has moved on.
 * Returns state unchanged if the active session is committed or null.
 */
function discardActiveDraft(state: SessionState): SessionState {
  if (state.activeSessionId === null) return state;
  const session = state.sessions[state.activeSessionId];
  if (session === undefined || !isDraftSession(session)) return state;

  const remaining = Object.fromEntries(Object.entries(state.sessions).filter(([key]) => key !== state.activeSessionId));
  return { activeSessionId: null, sessions: remaining };
}

/**
 * Create a new session with the given user-provided label and make it
 * active. The created timestamp is captured at call time.
 *
 * If an active draft exists, it is discarded in the same commit — the
 * user is navigating away from the draft by choosing a real name, so
 * it should not linger. (Drafts are ephemeral; see `discardActiveDraft`.)
 */
export function createSession(state: SessionState, label: string): SessionState {
  const base = discardActiveDraft(state);
  const session: Session = {
    id: randomUUID(),
    label,
    createdAt: Date.now(),
    events: [],
  };
  return {
    activeSessionId: session.id,
    sessions: { ...base.sessions, [session.id]: session },
  };
}

/**
 * Create a draft session (label "Untitled Session", `createdAt: null`)
 * and make it active. Drafts exist so the main `<List>` always has an
 * active session to render, avoiding the zero-children boundary that
 * triggers Raycast's ghost-row rendering bug (`use-session-delete.ts`).
 *
 * The draft is promoted to a real session on its first event mutation
 * or rename — see `updateActiveSessionEvents` and `renameSession`.
 */
export function createDraftSession(state: SessionState): SessionState {
  const session: Session = {
    id: randomUUID(),
    label: DRAFT_SESSION_LABEL,
    createdAt: null,
    events: [],
  };
  return {
    activeSessionId: session.id,
    sessions: { ...state.sessions, [session.id]: session },
  };
}

/** True iff the session has not yet been committed by a user action. */
export function isDraftSession(session: Session): boolean {
  return session.createdAt === null;
}

/**
 * Change a session's label. No-op if the id does not exist.
 *
 * Renaming a draft session promotes it: choosing a name is a clear
 * expression of intent, so we stamp `createdAt: Date.now()` at the
 * same time as applying the new label.
 */
export function renameSession(state: SessionState, id: SessionId, label: string): SessionState {
  const session = state.sessions[id];
  if (session === undefined) return state;
  const nextSession: Session = isDraftSession(session)
    ? { ...session, label, createdAt: Date.now() }
    : { ...session, label };
  return {
    ...state,
    sessions: { ...state.sessions, [id]: nextSession },
  };
}

/**
 * Remove a session. If the deleted session was active, the user lands
 * in a fresh draft session rather than "No Session" — even if other
 * sessions still exist, we do not auto-switch to one of them, because
 * that would be surprising and could make the user think they
 * undeleted something.
 *
 * The draft exists for two reasons:
 * 1. It preserves the invariant "there is always an active session to
 *    render", which keeps Raycast's `<List>` from crossing the
 *    zero-children boundary that triggers the ghost-row bug
 *    (`use-session-delete.ts`).
 * 2. A draft has `createdAt: null`, so it does not leave a stale
 *    "created N minutes ago" footprint in the picker for a session
 *    the user never actually created.
 */
export function deleteSession(state: SessionState, id: SessionId): SessionState {
  if (!(id in state.sessions)) return state;

  // Immutable filter-to-object rather than `delete` — lint forbids
  // dynamic key deletion, and this form is clearer anyway.
  const remaining = Object.fromEntries(Object.entries(state.sessions).filter(([key]) => key !== id));

  if (state.activeSessionId === id) {
    return createDraftSession({ activeSessionId: null, sessions: remaining });
  }

  return { activeSessionId: state.activeSessionId, sessions: remaining };
}

/**
 * Switch the active session. No-op if the id does not exist.
 *
 * If the previously-active session was a draft, it is discarded in the
 * same commit: the user is navigating away from it, and drafts are
 * ephemeral by definition.
 */
export function setActiveSession(state: SessionState, id: SessionId): SessionState {
  if (!(id in state.sessions)) return state;
  const base = discardActiveDraft(state);
  // `discardActiveDraft` may have removed a key, but we already verified
  // `id` exists in the original state and we never discard a non-draft.
  // If the requested id happened to be the draft itself (shouldn't
  // happen in practice — you don't "switch to" your own draft), fall
  // back to no-op on the discarded base.
  if (!(id in base.sessions)) return state;
  return { ...base, activeSessionId: id };
}

/**
 * Apply an updater function to the active session's events. This is the
 * single entry point for every event mutation (pin, edit, delete,
 * reinterpret) — the component wraps each existing event-list transform
 * in a call to this helper, so callsite code stays a one-liner and the
 * session bookkeeping lives in one place.
 *
 * If the active session is a draft and the updater produces a non-empty
 * result, this also promotes the draft: `createdAt` is stamped with
 * `Date.now()` in the same commit. The promotion happens here (rather
 * than in the component) so every mutation path flows through a single
 * choke point — impossible to forget.
 */
export function updateActiveSessionEvents(
  state: SessionState,
  updater: (events: readonly Event[]) => readonly Event[]
): SessionState {
  if (state.activeSessionId === null) return state;
  const session = state.sessions[state.activeSessionId];
  if (session === undefined) return state;

  const nextEvents = updater(session.events);
  if (nextEvents === session.events) return state;

  const shouldPromote = isDraftSession(session) && nextEvents.length > 0;
  const nextSession: Session = shouldPromote
    ? { ...session, createdAt: Date.now(), events: nextEvents }
    : { ...session, events: nextEvents };

  return {
    ...state,
    sessions: {
      ...state.sessions,
      [state.activeSessionId]: nextSession,
    },
  };
}
