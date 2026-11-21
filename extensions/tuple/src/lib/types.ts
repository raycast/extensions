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
  idle?: boolean;
  avatar_url?: string;
  /** Present when the CLI exposes a busy contact’s call. */
  call?: ContactCall | null;
}

export interface Machine {
  id: string;
  platform: string;
  device_name?: string;
  call_id?: string;
}

export function machineCallAction(machine: Machine): "start" | "none" {
  return machine.call_id ? "none" : "start";
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
  joinable: boolean;
}

export type Joinability = "joinable" | "not-joinable" | "unknown";

export function callJoinability(contact: Contact | undefined): Joinability {
  if (typeof contact?.call?.joinable !== "boolean") return "unknown";
  return contact.call.joinable ? "joinable" : "not-joinable";
}

export type ContactCallAction = "start" | "join" | "none";

export function contactCallAction(contact: Contact): ContactCallAction {
  if (contact.status === "busy") {
    return callJoinability(contact) === "joinable" ? "join" : "none";
  }
  return contact.status === "online" || contact.status === "available" ? "start" : "none";
}

export interface CallParticipant {
  id: number;
  full_name: string;
  email: string;
}

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

export interface VoiceNote {
  id: string;
  direction: "received" | "sent";
  person: { id: number; full_name: string; email: string };
  sent_at: string;
  duration_ms: number;
  heard: boolean;
  state: "ready" | "other_mac" | "damaged" | "sent";
  transcript: { state: "transcribing" | "done" | "failed" } | null;
}

export interface VoiceNoteTranscript {
  id: string;
  state: "done";
  text: string;
}

export interface CallView {
  call_id: string;
  muted: boolean;
  transcribing: boolean;
  active_room_slug: string | null;
  participants: CallViewParticipant[];
}

export interface CallViewParticipant {
  id: number;
  session_id?: string | null;
  avatar_url?: string;
  /** Display name: full name, falling back to short name. */
  name: string;
  email: string;
  muted: boolean | null;
  connection_state: string | null;
}

export function callPeople(participants: CallViewParticipant[]): CallViewParticipant[] {
  const seen = new Set<number | string>();
  return participants.filter((person) => {
    const key = person.id || person.email;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  /** RFC 3339 creation time; empty when the server has no timestamp. */
  created_at?: string;
  favorited: boolean;
  members: RoomMember[];
  kind: RoomKind;
  active_call: boolean;
}

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

export interface CaptureMatch {
  kind: "spoken" | "content";
  app_name?: string;
  url?: string;
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
  CaptureUnavailable = "transcription_unavailable",
  /** `call start` refused: the target is offline. The app offers no start action for them either. */
  ContactOffline = "contact_offline",
  /** `call start` refused: the target is already on a call. Join it instead. */
  ContactBusy = "contact_busy",
  /** `call join` refused: the target isn't on a call anyone can join. */
  NotJoinable = "not_joinable",
  CapabilityUnavailable = "capability_unavailable",
  /** Anything else — surfaced to the user verbatim. */
  Unknown = "unknown",
}

/**
 * The error envelope `--format json` writes to stderr (with exit 1) on
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
  readonly cliKind?: string;
  readonly status?: number;
  /** Raw stderr/stdout, preserved so the user sees the real failure rather than a generic message. */
  readonly detail?: string;

  constructor(kind: TupleErrorKind, message: string, detail?: string, payload?: TupleErrorPayload) {
    super(message);
    this.name = "TupleError";
    this.kind = kind;
    this.detail = detail;
    this.cliKind = payload?.kind;
    this.status = payload?.error_code;
  }
}

export interface CanonicalCall {
  id: string;
  state: "active" | "ended";
  title: string | null;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  participants: CallParticipant[];
}

export interface StateSummary {
  in_call: boolean;
  call: CallView | null;
}

export interface CaptureRecord {
  id: number;
  type: string;
  time: string;
  category?: "transcript" | "events" | "content";
  data: {
    user?: { id: number; full_name: string; email?: string };
    participants?: CallParticipant[];
    user_id?: number;
    text?: string;
    start?: string;
    veiled?: boolean;
    [key: string]: unknown;
  };
}

export interface ExportReceipt {
  file: string;
  format: string;
  calls: number;
  records: number;
  bytes: number;
  replaced: boolean;
}
