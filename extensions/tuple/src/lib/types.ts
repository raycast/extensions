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
 * The active call, as returned by both `tuple call current` and `state.current_call`
 * (confirmed against a live call). Mute state lives in `local.audio_enabled` (false = muted)
 * and the people in the call are `room.members` whose `presence[].value` is "in-call".
 * Fields are optional and the index signature tolerates the parts we do not model.
 */
export interface RoomMemberPresence {
  value?: string;
}

export interface RoomMember {
  id?: number;
  email?: string;
  full_name?: string;
  short_name?: string;
  status?: string;
  presence?: RoomMemberPresence[];
}

/** A connected participant in a direct (non-room) call — the top-level `participants` entries. */
export interface ActiveParticipant {
  id?: number;
  full_name?: string;
  short_name?: string;
  email?: string;
  audio_enabled?: boolean;
  connection_state?: string;
}

export interface CurrentCall {
  id?: string;
  started_at?: number;
  local?: { audio_enabled?: boolean; webcam_enabled?: boolean; connection_state?: string };
  /** Direct-call participants (the other people; the local user is in `local`, not here). */
  participants?: ActiveParticipant[];
  /** Room-based calls list people here instead, with presence "in-call" (includes the local user). */
  room?: { state?: string; members?: RoomMember[]; url?: { slug?: string; http_value?: string } };
  /** The local user's transcription lifecycle (per-participant feature); `state === "on"` means you're transcribing. */
  recorder?: { state?: string; has_model?: boolean };
}

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  short_name: string;
}

/** A Tuple room. `state.rooms` members are the people currently in that room. */
export interface Room {
  id?: number;
  slug: string;
  http_value: string;
  name?: string | null;
  favorited?: boolean;
  created_at?: string;
  members?: RoomMember[];
}

export interface TupleRooms {
  personal?: Room[];
  team?: Room[];
}

/** Top-level `tuple state --format json` payload (subset we consume). */
export interface TupleState {
  current_call?: CurrentCall | null;
  current_user?: CurrentUser;
  contacts?: Contact[];
  rooms?: TupleRooms;
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
