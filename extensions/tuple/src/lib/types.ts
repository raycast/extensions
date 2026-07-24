/** Shapes returned by `tuple <command> --format json`, plus the extension's error taxonomy. */

export type ContactStatus = "online" | "busy" | "offline" | (string & {});
export type ContactKind = "teammate" | "external" | (string & {});

export interface Contact {
  id: number;
  email: string;
  full_name: string;
  short_name: string;
  kind: ContactKind;
  favorited: boolean;
  recent: boolean;
  status: ContactStatus;
}

export interface CallParticipant {
  id: number;
  full_name: string;
  email: string;
}

/** A stored (recorded) call, from `tuple transcription list`. */
export interface StoredCall {
  call_id: string;
  title: string;
  started_at: string;
  ended_at: string;
  summary: string;
  recordings: number;
  segments: number;
  participants: CallParticipant[];
}

/**
 * The active call, normalized by `tuple call current --format json`. The CLI
 * reconciles the direct-call and room-based shapes into one flat roster:
 * `participants` is the other people (the local user is already excluded),
 * `muted` is the local mic state, `transcribing` is whether the local user is
 * recording the call, and `active_room_slug` is the room slug for room-based
 * calls (null for direct calls). The command exits non-zero when there is no
 * active call, so consumers handle absence via the NoActiveCall error rather
 * than a null payload.
 */
export interface CallView {
  call_id: string;
  muted: boolean;
  transcribing: boolean;
  active_room_slug: string | null;
  participants: CallViewParticipant[];
}

export interface CallViewParticipant {
  id: number;
  /** Display name: full name, falling back to short name. */
  name: string;
  email: string;
  /** Per-participant mute, when the wire shape carries it (null for room-based calls). */
  muted: boolean | null;
  connection_state: string | null;
}

export type RoomKind = "personal" | "team";

/** A person currently present in a room, from `tuple rooms list`. */
export interface RoomMember {
  id: number;
  full_name: string;
  email: string;
}

/**
 * A Tuple room from `tuple rooms list --format json`, which returns one flat,
 * `kind`-tagged list rather than a personal/team split. `members` are the people
 * currently in the room; `active_call` is set server-side when the user's current
 * call is in this room.
 */
export interface Room {
  slug: string;
  name: string;
  http_value: string;
  favorited: boolean;
  members: RoomMember[];
  kind: RoomKind;
  active_call: boolean;
}

/** One full-text search hit, from `tuple transcription search --format json`. */
export interface TranscriptMatch {
  call_id: string;
  time: string;
  user_id: number;
  speaker: string;
  /** Match text with `[[...]]` markers around the matched terms. */
  snippet: string;
  text: string;
}

export enum TupleErrorKind {
  /** The `tuple` binary could not be found or executed. */
  NotInstalled = "not_installed",
  /** A call-scoped command ran while no call was active. Often a normal state, not a failure. */
  NoActiveCall = "no_active_call",
  /** Tried to join a call/room while already in one — the CLI rejects this rather than switching. */
  AlreadyInCall = "already_in_call",
  /** The Tuple app/daemon is not running, so the CLI could not reach it. */
  DaemonDown = "daemon_down",
  /** The transcript store doesn't exist yet — transcription has never run on this machine. */
  TranscriptionUnavailable = "transcription_unavailable",
  /** Anything else — surfaced to the user verbatim. */
  Unknown = "unknown",
}

export class TupleError extends Error {
  readonly kind: TupleErrorKind;
  /** Raw stderr/stdout, preserved so the user sees the real failure rather than a generic message. */
  readonly detail?: string;

  constructor(kind: TupleErrorKind, message: string, detail?: string) {
    super(message);
    this.name = "TupleError";
    this.kind = kind;
    this.detail = detail;
  }
}
