export type Event = {
  readonly id: string;
  readonly timestamp: number; // epoch ms (canonical UTC)
  readonly iso: string; // ISO8601 UTC
  readonly local: string; // localized representation
  readonly data: string; // free-form context (initially the source log line; editable)
  readonly label: string | null; // user-assigned source label (e.g., "api-gw", "db")
  readonly url: string | null; // reference URL (e.g., link to log viewer, PR, incident)
  readonly ingestedAt: number;
};

export type SessionId = string;

/**
 * A named bundle of pinned events — a coherent timeline for a single
 * purpose (an incident, an investigation, a debugging run). Exactly one
 * session is active at any time and the main List view operates on it.
 */
export type Session = {
  readonly id: SessionId;
  readonly label: string;
  // epoch ms, or null for a "draft" session that exists structurally
  // (e.g., created implicitly after deleting the active session) but
  // has not yet been committed by a user action. Drafts are promoted
  // to real sessions on first mutation or rename, at which point
  // createdAt is stamped. See `updateActiveSessionEvents` in
  // lib/sessions.ts and `use-session-delete.ts` for the motivation.
  readonly createdAt: number | null;
  readonly events: readonly Event[];
};

/**
 * Top-level storage shape. Invariant: `activeSessionId` is either null
 * (when `sessions` is empty) or a key that exists in `sessions`. All
 * transforms in `lib/sessions.ts` preserve this invariant.
 */
export type SessionState = {
  readonly activeSessionId: SessionId | null;
  readonly sessions: Readonly<Record<SessionId, Session>>;
};

export type ParsedTimestamp = {
  // Epoch ms. For ambiguous inputs this is a tentative value assuming UTC;
  // once `reinterpret` has run the value is authoritative and `ambiguous`
  // flips to false.
  readonly timestamp: number;
  readonly iso: string; // ISO8601 UTC
  readonly local: string; // localized representation
  readonly data: string; // source line the timestamp was extracted from
  readonly ambiguous: boolean; // true if no timezone was specified in the source
  readonly label: string | null; // user-assigned label, editable before pinning
  readonly url: string | null; // user-assigned URL, editable before pinning
  readonly source: string; // the exact substring that matched (e.g., "682622673b5180d9ee419e13")
  readonly format: string; // human-readable format name (e.g., "MongoDB ObjectID", "ISO8601")
};
