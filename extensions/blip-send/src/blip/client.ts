import protobuf from "protobufjs";
import descriptor from "./descriptor.json";
import { invoke } from "./drpc";

const root = protobuf.Root.fromJSON(descriptor as protobuf.INamespace);
const StateRequest = root.lookupType("rpc.StateRequest");
const BinaryStateResponse = root.lookupType("rpc.BinaryStateResponse");
const DispatchRequest = root.lookupType("rpc.DispatchRequest");
const Any = root.lookupType("google.protobuf.Any");
const State = root.lookupType("frontend.State");

const TO_OBJECT = { enums: String, longs: Number, bytes: String, defaults: false } as const;

// ---- Types (subset of Blip's frontend.State that the extension uses) ----

export interface Timestamp {
  seconds?: number;
  nanos?: number;
}

export type DeviceKind = "GenericDevice" | "Phone" | "Tablet" | "Laptop" | "Desktop";

export interface Device {
  device_id: string;
  kind?: DeviceKind;
  name?: string;
  reach?: { is_online?: boolean; is_pushable?: boolean };
  last_online?: Timestamp;
  is_self?: boolean;
}

export interface User {
  user_id: string;
  email?: string;
  name?: string;
  avatar_micro_rep?: string;
  devices?: Record<string, Device>;
  is_contact?: boolean;
  is_self?: boolean;
  is_searchable?: boolean;
  plan_kind?: "Unknown" | "Free" | "Paid";
}

export interface PeerId {
  user_id?: string;
  device_id?: string;
}

export type TransferStatus =
  | "UnknownStatus"
  | "Created"
  | "InviteRequested"
  | "Invited"
  | "Pending"
  | "Active"
  | "Paused"
  | "ResumeRequested"
  | "Completed"
  | "Cancelled";

export interface ArchiveItem {
  file?: { size?: number; mod_time_ms?: number; is_executable?: boolean };
  folder?: Record<string, never>;
  link?: { destination?: string };
  folder_stub?: { size?: number; children?: number };
}

export interface TransferErr {
  code?: string;
  msg?: string;
  action_required?: boolean;
  fatal?: boolean;
}

export interface Transfer {
  transfer_id: string;
  peer_id?: PeerId;
  content_job_count?: number;
  archive_stub?: { items?: Record<string, ArchiveItem>; disk_locations?: Record<string, string> };
  unpack_state?: string;
  local_err?: TransferErr;
  remote_err?: TransferErr;
  direction?: "UnknownDirection" | "Incoming" | "Outgoing";
  status?: TransferStatus;
  is_resumable?: boolean;
  is_dismissed?: boolean;
  progress?: number;
  stats?: {
    kbps?: number;
    is_relayed?: boolean;
    is_wan?: boolean;
    is_end_to_end_encrypted?: boolean;
    is_starved?: boolean;
    stripes?: number;
  };
  updated_at?: Timestamp;
}

export interface Search {
  query?: string;
  fetch_status?: "Unknown" | "InProgress" | "Failed" | "Complete";
  local_results?: PeerId[];
  server_results?: PeerId[];
}

export interface BlipState {
  version?: number;
  config?: {
    auto_accept_disabled?: boolean;
    auto_save_media_to_library?: boolean;
    custom_default_save_path?: string;
    limit_upload_mbps?: number;
    limit_download_mbps?: number;
  };
  auth?: { user_id?: string; email?: string; device_id?: string };
  registration?: unknown;
  messaging?: { status?: "CLOSED" | "PENDING" | "OPEN" | "CLOSING"; initial_sync_complete?: boolean };
  users?: {
    discovered?: Record<string, User>;
    contacts?: Record<string, boolean>;
    recent_interactions?: { time?: Timestamp; peer_id?: PeerId; initiated_by_peer?: boolean }[];
  };
  transfers?: Record<string, Transfer>;
  searches?: Record<string, Search>;
  system_info?: { is_asleep?: boolean; is_network_available?: boolean; available_network_kind?: string };
}

export interface StateSnapshot {
  id: number;
  state: BlipState;
}

// ---- RPC ----

/**
 * Fetches Blip's full frontend state. When `lastReceived` is given, Blip blocks
 * until the state changes (long poll), so pass a timeout that suits the caller.
 */
export async function getState(lastReceived?: number, timeoutMs = 10_000): Promise<StateSnapshot> {
  const request = StateRequest.encode(lastReceived === undefined ? {} : { last_rcvd: lastReceived }).finish();
  const raw = await invoke("/rpc.Service/GetState", request, timeoutMs);
  const response = BinaryStateResponse.toObject(BinaryStateResponse.decode(raw), { longs: Number }) as {
    id: number;
    state: Uint8Array;
  };
  const state = State.toObject(State.decode(response.state), TO_OBJECT) as BlipState;
  return { id: response.id, state };
}

export type EventName =
  | "TransferCreateRequested"
  | "TransferAddContentRequested"
  | "TransferInviteRequested"
  | "TransferAcceptanceRequested"
  | "TransferDeclineRequested"
  | "TransferPauseRequested"
  | "TransferResume"
  | "TransferCancellationRequested"
  | "TransferDismiss"
  | "TransferRemoveRequested"
  | "TransferSetAutoAccept"
  | "TransferSetCustomDefaultSavePath"
  | "TransferSetSpeedLimits"
  | "UpdateDevice"
  | "RemoveDevice"
  | "RemoveContact"
  | "AddBlockedUser"
  | "Search"
  | "AbandonSearch";

/** Sends one event to Blip's core. Events are wrapped in google.protobuf.Any, as Blip's own UI does. */
export async function dispatch(name: EventName, payload: Record<string, unknown>): Promise<void> {
  const Message = root.lookupType(`event.${name}`);
  const problem = Message.verify(payload);
  if (problem) throw new Error(`Invalid ${name} event: ${problem}`);
  const value = Message.encode(Message.fromObject(payload)).finish();
  const any = Any.encode({ type_url: `type.googleapis.com/event.${name}`, value }).finish();
  await invoke("/rpc.Service/Dispatch", DispatchRequest.encode({ event: any }).finish());
}
