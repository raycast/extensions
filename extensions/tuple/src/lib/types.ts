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
  /** Present for a busy contact: the call they're on. Absent on CLIs predating the contract. */
  call?: ContactCall | null;
}

/**
 * The call a busy contact is on. `joinable` is the CLI's own derivation of the
 * predicate the engine enforces before letting anyone in, so consumers branch
 * on it rather than reproducing the participant/capacity arithmetic.
 */
export interface ContactCall {
  id: string;
  participant_ids: number[];
  capacity: number;
  sfu_backed: boolean;
  personal_room?: { owner: number; auto_join_behavior: string } | null;
  joinable?: boolean;
}

/**
 * Whether a busy contact's call can be joined. `unknown` is the older-CLI case:
 * builds predating the contract omit `call` entirely, so there is nothing to
 * judge — the action stays on offer and the CLI rejects it if it must. Treating
 * unknown as "not joinable" would strip Join Call from every busy contact
 * against those builds.
 */
export type Joinability = "joinable" | "not-joinable" | "unknown";

export function callJoinability(contact: Contact | undefined): Joinability {
  const call = contact?.call;
  if (!call) {
    return "unknown";
  }
  if (typeof call.joinable === "boolean") {
    return call.joinable ? "joinable" : "not-joinable";
  }
  // A build that sends the call but not the derived flag: apply the same predicate.
  if (call.id && Array.isArray(call.participant_ids) && typeof call.capacity === "number") {
    return call.participant_ids.length < call.capacity ? "joinable" : "not-joinable";
  }
  return "unknown";
}

/**
 * What a contact's entry should offer. Mirrors the Tuple app's popover: no way
 * to ring someone offline, and joining only a call that has room. The CLI
 * enforces the same rules — `call start` at an offline or busy target is
 * rejected outright — so offering the action anyway would just be a button that
 * fails. Forcing past the guard is deliberately not on offer, because the app
 * doesn't offer it either.
 *
 * A status that is neither busy nor offline counts as reachable: the daemon
 * passes presence through verbatim and "available" is a synonym for online.
 */
export type ContactCallAction = "start" | "join" | "none";

export function contactCallAction(contact: Contact): ContactCallAction {
  if (contact.status === "busy") {
    return callJoinability(contact) === "not-joinable" ? "none" : "join";
  }
  return contact.status === "offline" ? "none" : "start";
}

export interface CallParticipant {
  id: number;
  full_name: string;
  email: string;
}

/** One grouped live call from `tuple call list`. */
export interface OngoingCall {
  id: string;
  participants: CallParticipant[];
  unknown_participants: number;
  anonymous: boolean;
  capacity: number;
  joinable: boolean;
  room: { slug: string; name: string } | null;
  current: boolean;
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
  /** RFC 3339 creation time. Older CLIs omit it. */
  created_at?: string;
  favorited: boolean;
  members: RoomMember[];
  kind: RoomKind;
  active_call: boolean;
}

/** The newest-created personal room when the CLI provides enough data to identify it reliably. */
export function primaryPersonalRoom(rooms: Room[]): Room | undefined {
  const personalRooms = rooms.filter((room) => room.kind === "personal");
  if (personalRooms.length <= 1) {
    return personalRooms[0];
  }
  if (personalRooms.some((room) => !room.created_at)) {
    return undefined;
  }
  return personalRooms.reduce((primary, room) => (room.created_at! > primary.created_at! ? room : primary));
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
  /** Tried to join a call/room while already in one without asking the CLI to switch. */
  AlreadyInCall = "already_in_call",
  /** The Tuple app/daemon is not running, so the CLI could not reach it. */
  DaemonDown = "daemon_down",
  /** The transcript store doesn't exist yet — transcription has never run on this machine. */
  TranscriptionUnavailable = "transcription_unavailable",
  /** `call start` refused: the target is offline. The app offers no start action for them either. */
  ContactOffline = "contact_offline",
  /** `call start` refused: the target is already on a call. Join it instead. */
  ContactBusy = "contact_busy",
  /** `call join` refused: the target isn't on a call anyone can join. */
  NotJoinable = "not_joinable",
  /** Anything else — surfaced to the user verbatim. */
  Unknown = "unknown",
}

/**
 * The error envelope `--format json` writes to *stdout* (with exit 1) on
 * current CLIs. `kind` is the daemon's or command's stable identifier;
 * `error_code` is the HTTP status when the failure came from the daemon.
 */
export interface TupleErrorPayload {
  error?: string;
  error_code?: number;
  kind?: string;
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
