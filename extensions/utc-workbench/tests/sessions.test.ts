import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_SESSION_STATE,
  createDraftSession,
  createSession,
  deleteSession,
  getActiveSession,
  isDraftSession,
  listSessions,
  renameSession,
  setActiveSession,
  updateActiveSessionEvents,
} from "../src/lib/sessions";
import { addEvent } from "../src/lib/store";
import type { Event, ParsedTimestamp, SessionState } from "../src/types";

// Fake timers let us construct sessions with deterministic, distinct
// createdAt values — real Date.now() has millisecond resolution and a
// tight loop of createSession calls can tie, which makes "most recently
// created" ordering ambiguous.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function parsed(timestamp: number, data = "line"): ParsedTimestamp {
  return {
    timestamp,
    iso: new Date(timestamp).toISOString(),
    local: "irrelevant",
    data,
    ambiguous: false,
    label: null,
    url: null,
    source: "",
    format: "Test",
  };
}

/**
 * Build a state with N sessions created in order. Advances the mock
 * clock by 1ms between creates so `createdAt` values are distinct and
 * the last label passed is unambiguously the most recently created.
 */
function stateWith(...labels: string[]): SessionState {
  let state = EMPTY_SESSION_STATE;
  for (const label of labels) {
    state = createSession(state, label);
    vi.advanceTimersByTime(1);
  }
  return state;
}

describe("createSession", () => {
  it("creates a session with the given label and makes it active", () => {
    const state = createSession(EMPTY_SESSION_STATE, "db-outage");
    expect(state.activeSessionId).not.toBeNull();
    const active = getActiveSession(state);
    expect(active).not.toBeNull();
    expect(active!.label).toBe("db-outage");
    expect(active!.events).toEqual([]);
  });

  it("captures a createdAt close to now", () => {
    const before = Date.now();
    const state = createSession(EMPTY_SESSION_STATE, "x");
    const after = Date.now();
    const active = getActiveSession(state);
    expect(active!.createdAt).toBeGreaterThanOrEqual(before);
    expect(active!.createdAt).toBeLessThanOrEqual(after);
  });

  it("preserves prior sessions and switches active to the new one", () => {
    const s1 = createSession(EMPTY_SESSION_STATE, "first");
    const firstId = s1.activeSessionId!;
    const s2 = createSession(s1, "second");
    expect(Object.keys(s2.sessions)).toHaveLength(2);
    expect(s2.activeSessionId).not.toBe(firstId);
    expect(s2.sessions[firstId]).toBeDefined();
  });

  it("assigns a unique id per call", () => {
    const s = createSession(createSession(EMPTY_SESSION_STATE, "a"), "b");
    const ids = Object.keys(s.sessions);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("getActiveSession", () => {
  it("returns null when state is empty", () => {
    expect(getActiveSession(EMPTY_SESSION_STATE)).toBeNull();
  });

  it("returns the active session when one is set", () => {
    const state = createSession(EMPTY_SESSION_STATE, "x");
    expect(getActiveSession(state)!.label).toBe("x");
  });
});

describe("listSessions", () => {
  it("puts the active session first, then the rest by createdAt descending", () => {
    // stateWith creates in order and activates the last one, so 'newest'
    // is active. Active-first and recency-desc align in this case.
    const state = stateWith("oldest", "middle", "newest");
    const listed = listSessions(state);
    expect(listed.map((s) => s.label)).toEqual(["newest", "middle", "oldest"]);
  });

  it("puts the active session first even when it is not the most recent", () => {
    // Create three sessions (active switches to 'newest'), then
    // explicitly switch the active session back to 'oldest'. listSessions
    // should now surface 'oldest' at the top, with the remaining two in
    // recency order.
    let state = stateWith("oldest", "middle", "newest");
    const oldestId = Object.values(state.sessions).find((s) => s.label === "oldest")!.id;
    state = setActiveSession(state, oldestId);

    const listed = listSessions(state);
    expect(listed.map((s) => s.label)).toEqual(["oldest", "newest", "middle"]);
  });

  it("returns empty array when no sessions exist", () => {
    expect(listSessions(EMPTY_SESSION_STATE)).toEqual([]);
  });
});

describe("renameSession", () => {
  it("updates the label of an existing session", () => {
    const state = createSession(EMPTY_SESSION_STATE, "initial");
    const id = state.activeSessionId!;
    const renamed = renameSession(state, id, "updated");
    expect(renamed.sessions[id]!.label).toBe("updated");
  });

  it("preserves createdAt and events on rename", () => {
    const state = createSession(EMPTY_SESSION_STATE, "initial");
    const id = state.activeSessionId!;
    const withEvent = updateActiveSessionEvents(state, (events) => addEvent(events, parsed(1_000), "tag"));
    const before = withEvent.sessions[id]!;
    const renamed = renameSession(withEvent, id, "updated");
    const after = renamed.sessions[id]!;
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.events).toEqual(before.events);
  });

  it("is a no-op when the id does not exist", () => {
    const state = createSession(EMPTY_SESSION_STATE, "x");
    const unchanged = renameSession(state, "does-not-exist", "ignored");
    expect(unchanged).toEqual(state);
  });
});

describe("deleteSession", () => {
  it("removes a non-active session and keeps active unchanged", () => {
    const state = stateWith("first", "second");
    const activeId = state.activeSessionId!;
    const otherId = Object.keys(state.sessions).find((id) => id !== activeId)!;
    const next = deleteSession(state, otherId);
    expect(next.activeSessionId).toBe(activeId);
    expect(Object.keys(next.sessions)).toHaveLength(1);
    expect(next.sessions[otherId]).toBeUndefined();
  });

  it("replaces the active session with a fresh draft, leaving other sessions intact", () => {
    const state = stateWith("oldest", "middle", "newest");
    // 'newest' is active (createSession activates). Deleting it should
    // drop us into a fresh draft session — NOT auto-switch to one of
    // the remaining sessions, and NOT leave activeSessionId null. See
    // `use-session-delete.ts` for why we avoid the zero-children boundary.
    const newestId = state.activeSessionId!;
    const next = deleteSession(state, newestId);

    expect(next.activeSessionId).not.toBeNull();
    expect(next.activeSessionId).not.toBe(newestId);
    // Three total now: the two untouched sessions plus the new draft.
    expect(Object.keys(next.sessions)).toHaveLength(3);
    // Original non-active sessions are preserved unchanged.
    expect(
      Object.values(next.sessions)
        .map((s) => s.label)
        .sort()
    ).toEqual(["Untitled Session", "middle", "oldest"]);

    const active = getActiveSession(next);
    expect(active).not.toBeNull();
    expect(active!.label).toBe("Untitled Session");
    expect(active!.createdAt).toBeNull();
    expect(isDraftSession(active!)).toBe(true);
  });

  it("deletes the last remaining session and drops into a fresh draft", () => {
    const state = createSession(EMPTY_SESSION_STATE, "only");
    const id = state.activeSessionId!;
    const next = deleteSession(state, id);

    // The old session is gone, replaced by a draft. Sessions map is
    // not empty — it contains exactly the draft.
    expect(next.sessions[id]).toBeUndefined();
    expect(Object.keys(next.sessions)).toHaveLength(1);

    const active = getActiveSession(next);
    expect(active).not.toBeNull();
    expect(isDraftSession(active!)).toBe(true);
  });

  it("is a no-op when the id does not exist", () => {
    const state = stateWith("a", "b");
    const next = deleteSession(state, "nope");
    expect(next).toEqual(state);
  });
});

describe("setActiveSession", () => {
  it("switches to an existing session", () => {
    const state = stateWith("a", "b");
    const activeId = state.activeSessionId!;
    const otherId = Object.keys(state.sessions).find((id) => id !== activeId)!;
    const next = setActiveSession(state, otherId);
    expect(next.activeSessionId).toBe(otherId);
  });

  it("is a no-op for unknown ids", () => {
    const state = stateWith("a");
    const next = setActiveSession(state, "nope");
    expect(next).toEqual(state);
  });
});

describe("updateActiveSessionEvents", () => {
  it("applies the updater to the active session events only", () => {
    const state = stateWith("a", "b");
    const activeId = state.activeSessionId!;
    const otherId = Object.keys(state.sessions).find((id) => id !== activeId)!;

    const next = updateActiveSessionEvents(state, (events) => addEvent(events, parsed(1_000), "tag"));
    expect(next.sessions[activeId]!.events).toHaveLength(1);
    expect(next.sessions[otherId]!.events).toHaveLength(0);
  });

  it("returns the same state reference when the updater returns the same array", () => {
    const state = createSession(EMPTY_SESSION_STATE, "x");
    const identical = updateActiveSessionEvents(state, (events) => events);
    expect(identical).toBe(state);
  });

  it("is a no-op when there is no active session", () => {
    const next = updateActiveSessionEvents(EMPTY_SESSION_STATE, (events) => [...events]);
    expect(next).toEqual(EMPTY_SESSION_STATE);
  });

  it("can remove events", () => {
    let state = createSession(EMPTY_SESSION_STATE, "x");
    state = updateActiveSessionEvents(state, (events) => addEvent(events, parsed(1_000), "a"));
    state = updateActiveSessionEvents(state, (events) => addEvent(events, parsed(2_000), "b"));
    const trimmed = updateActiveSessionEvents(state, (events) => events.filter((e: Event) => e.label === "a"));
    expect(trimmed.sessions[trimmed.activeSessionId!]!.events).toHaveLength(1);
  });

  it("promotes a draft session on first non-empty mutation", () => {
    // Simulate mounting time: the draft is created "earlier", and then
    // the user pins an event "later". The promoted createdAt should
    // reflect the pin time, not the draft creation time.
    const draftState = createDraftSession(EMPTY_SESSION_STATE);
    const draftId = draftState.activeSessionId!;
    expect(draftState.sessions[draftId]!.createdAt).toBeNull();

    vi.advanceTimersByTime(5_000);
    const promoteTime = Date.now();

    const promoted = updateActiveSessionEvents(draftState, (events) => addEvent(events, parsed(1_000), "first"));

    const active = getActiveSession(promoted)!;
    expect(active.createdAt).toBe(promoteTime);
    expect(isDraftSession(active)).toBe(false);
    expect(active.events).toHaveLength(1);
    // Label is unchanged by promotion.
    expect(active.label).toBe("Untitled Session");
  });

  it("does not promote a draft if the mutation leaves events empty", () => {
    // An updater that returns an empty array (e.g., a no-op remove on an
    // already-empty list, or a filter that removes everything) should
    // not count as "committed intent" — the draft stays a draft.
    const draftState = createDraftSession(EMPTY_SESSION_STATE);
    const next = updateActiveSessionEvents(draftState, () => []);
    const active = getActiveSession(next)!;
    expect(active.createdAt).toBeNull();
    expect(isDraftSession(active)).toBe(true);
  });
});

describe("createDraftSession", () => {
  it("creates a draft with null createdAt and makes it active", () => {
    const state = createDraftSession(EMPTY_SESSION_STATE);
    const active = getActiveSession(state);
    expect(active).not.toBeNull();
    expect(active!.createdAt).toBeNull();
    expect(active!.label).toBe("Untitled Session");
    expect(active!.events).toEqual([]);
    expect(isDraftSession(active!)).toBe(true);
  });

  it("preserves existing sessions", () => {
    const base = createSession(EMPTY_SESSION_STATE, "existing");
    const existingId = base.activeSessionId!;
    const next = createDraftSession(base);
    expect(Object.keys(next.sessions)).toHaveLength(2);
    expect(next.sessions[existingId]!.label).toBe("existing");
    expect(next.activeSessionId).not.toBe(existingId);
  });
});

describe("draft promotion via rename", () => {
  it("renaming a draft stamps createdAt and applies the new label", () => {
    const draftState = createDraftSession(EMPTY_SESSION_STATE);
    const id = draftState.activeSessionId!;

    vi.advanceTimersByTime(3_000);
    const renameTime = Date.now();

    const renamed = renameSession(draftState, id, "db-outage");
    const session = renamed.sessions[id]!;
    expect(session.label).toBe("db-outage");
    expect(session.createdAt).toBe(renameTime);
    expect(isDraftSession(session)).toBe(false);
  });

  it("renaming a committed session does not change its createdAt", () => {
    const state = createSession(EMPTY_SESSION_STATE, "original");
    const id = state.activeSessionId!;
    const before = state.sessions[id]!.createdAt;

    vi.advanceTimersByTime(10_000);
    const renamed = renameSession(state, id, "new-name");
    expect(renamed.sessions[id]!.createdAt).toBe(before);
  });
});

describe("listSessions with drafts", () => {
  it("filters draft sessions out of the list entirely", () => {
    // Build a real session, then a draft. The draft is the active
    // session in state but should NOT appear in the picker list —
    // drafts are structural, not user-facing artifacts.
    let state = createSession(EMPTY_SESSION_STATE, "committed");
    vi.advanceTimersByTime(1);
    // Manually inject a draft without going through createDraftSession
    // (which would go through discardActiveDraft logic on transitions).
    state = {
      activeSessionId: state.activeSessionId,
      sessions: {
        ...state.sessions,
        "draft-id": {
          id: "draft-id",
          label: "Untitled Session",
          createdAt: null,
          events: [],
        },
      },
    };

    const listed = listSessions(state);
    expect(listed.map((s) => s.label)).toEqual(["committed"]);
  });

  it("returns an empty list when the only session is a draft", () => {
    const state = createDraftSession(EMPTY_SESSION_STATE);
    expect(listSessions(state)).toEqual([]);
  });
});

describe("draft discard on navigation", () => {
  it("setActiveSession discards the previously-active draft", () => {
    // Create a committed session, then simulate deleting it (which
    // drops us into a draft), then switch back to another committed
    // session. The draft should be gone from state entirely.
    let state = createSession(EMPTY_SESSION_STATE, "keeper");
    const keeperId = state.activeSessionId!;
    vi.advanceTimersByTime(1);
    state = createSession(state, "to-delete");
    state = deleteSession(state, state.activeSessionId!);

    // We're now in a draft. Verify that first.
    const draftActive = getActiveSession(state)!;
    expect(isDraftSession(draftActive)).toBe(true);
    const draftId = state.activeSessionId!;
    expect(Object.keys(state.sessions)).toContain(draftId);

    // Switch to the keeper. The draft should be removed.
    const switched = setActiveSession(state, keeperId);
    expect(switched.activeSessionId).toBe(keeperId);
    expect(switched.sessions[draftId]).toBeUndefined();
    expect(Object.keys(switched.sessions)).toHaveLength(1);
  });

  it("createSession discards the previously-active draft", () => {
    // Start in a draft (as if we'd just deleted the only session), then
    // the user creates a named "New Session". The draft should vanish.
    let state = createDraftSession(EMPTY_SESSION_STATE);
    const draftId = state.activeSessionId!;
    vi.advanceTimersByTime(1);
    state = createSession(state, "real-one");

    expect(state.sessions[draftId]).toBeUndefined();
    expect(Object.keys(state.sessions)).toHaveLength(1);
    const active = getActiveSession(state)!;
    expect(active.label).toBe("real-one");
    expect(isDraftSession(active)).toBe(false);
  });

  it("setActiveSession does not touch a committed active session", () => {
    // Regression guard: discardActiveDraft should only fire on drafts,
    // not indiscriminately on every setActiveSession call.
    const state = stateWith("a", "b");
    const activeId = state.activeSessionId!;
    const otherId = Object.keys(state.sessions).find((id) => id !== activeId)!;
    const next = setActiveSession(state, otherId);
    expect(Object.keys(next.sessions)).toHaveLength(2);
    expect(next.sessions[activeId]).toBeDefined();
  });
});
