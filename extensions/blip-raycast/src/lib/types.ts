/** Shapes of the decoded Blip state (snake_case, as in Blip's schema). Only the parts we use. */

export interface Timestamp {
  seconds: string;
  nanos: number;
}

export interface PeerId {
  user_id: string;
  device_id: string;
}

export const DeviceKind = { Generic: 0, Phone: 2, Tablet: 3, Laptop: 4, Desktop: 5 } as const;

export interface Device {
  device_id: string;
  kind: number;
  name: string;
  reach?: { is_online: boolean; is_pushable: boolean };
  last_online?: Timestamp;
  is_self: boolean;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  devices: Record<string, Device>;
  is_contact: boolean;
  is_self: boolean;
  is_searchable: boolean;
}

export const TransferStatus = {
  Unknown: 0,
  Created: 1,
  InviteRequested: 2,
  Invited: 3,
  Pending: 4,
  Active: 5,
  Paused: 6,
  ResumeRequested: 7,
  Completed: 8,
  Cancelled: 9,
} as const;

export const TransferDirection = { Unknown: 0, Incoming: 1, Outgoing: 2 } as const;

export interface TransferErr {
  code: number;
  msg: string;
  action_required: boolean;
  fatal: boolean;
}

export interface ArchiveItem {
  file?: { size: string; mod_time_ms: string; is_executable: boolean };
  folder?: Record<string, never>;
  link?: { destination: string };
  folder_stub?: { size: string; children: string };
}

export interface Transfer {
  transfer_id: string;
  peer_id?: PeerId;
  archive_stub?: { items: Record<string, ArchiveItem>; disk_locations: Record<string, string> };
  destination_location: string;
  local_err?: TransferErr;
  remote_err?: TransferErr;
  direction: number;
  status: number;
  is_resumable: boolean;
  is_dismissed: boolean;
  progress: string;
  stats?: { kbps: number; is_relayed: boolean; is_wan: boolean; is_end_to_end_encrypted: boolean };
  updated_at?: Timestamp;
}

export interface Config {
  auto_accept_disabled: boolean;
  auto_save_media_to_library: boolean;
  custom_default_save_path: string;
  limit_upload_mbps: number;
  limit_download_mbps: number;
}

export const SearchStatus = { Unknown: 0, InProgress: 1, Failed: 2, Complete: 3 } as const;

export interface Search {
  query: string;
  fetch_status: number;
  local_results: PeerId[];
  server_results: PeerId[];
}

export interface BlipState {
  version: number;
  config?: Config;
  auth?: { user_id: string; email: string; device_id: string };
  users?: {
    discovered: Record<string, User>;
    /** user_id → is a contact. */
    contacts: Record<string, boolean>;
    recent_interactions: { time?: Timestamp; peer_id?: PeerId; initiated_by_peer: boolean }[];
  };
  transfers: Record<string, Transfer>;
  searches: Record<string, Search>;
  shutting_down?: boolean;
  launch_time?: Timestamp;
}
