import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { dispatch, getState } from "./client";
import type { BlipState, Device, PeerId, Transfer, TransferStatus, User } from "./client";
import { formatBytes, pluralize, toDate } from "./format";

// ---- Recipients ----

export interface DeviceRecipient {
  kind: "device";
  id: string;
  title: string;
  device: Device;
  online: boolean;
  lastOnline?: Date;
  peer: PeerId;
}

export interface PersonRecipient {
  kind: "person";
  id: string;
  title: string;
  email: string;
  user: User;
  onlineDevices: number;
  lastInteraction?: Date;
  isContact: boolean;
  peer: PeerId;
}

export type Recipient = DeviceRecipient | PersonRecipient;

export function selfUser(state: BlipState): User | undefined {
  const id = state.auth?.user_id;
  return id ? state.users?.discovered?.[id] : undefined;
}

export function isSignedIn(state: BlipState): boolean {
  return Boolean(state.auth?.user_id);
}

/** Your own devices, excluding this Mac. Online first, then most recently seen. */
export function myDevices(state: BlipState): DeviceRecipient[] {
  const me = selfUser(state);
  const userId = state.auth?.user_id;
  if (!me || !userId) return [];
  const thisDevice = state.auth?.device_id;
  return Object.values(me.devices ?? {})
    .filter((d) => d.device_id !== thisDevice && !d.is_self)
    .map<DeviceRecipient>((d) => ({
      kind: "device",
      id: d.device_id,
      title: d.name || "Unnamed device",
      device: d,
      online: Boolean(d.reach?.is_online),
      lastOnline: toDate(d.last_online),
      peer: { user_id: userId, device_id: d.device_id },
    }))
    .sort(sortDevices);
}

export function thisDevice(state: BlipState): Device | undefined {
  const me = selfUser(state);
  const id = state.auth?.device_id;
  return me && id ? me.devices?.[id] : undefined;
}

function sortDevices(a: DeviceRecipient, b: DeviceRecipient): number {
  if (a.online !== b.online) return a.online ? -1 : 1;
  const at = a.lastOnline?.getTime() ?? 0;
  const bt = b.lastOnline?.getTime() ?? 0;
  if (at !== bt) return bt - at;
  return a.title.localeCompare(b.title);
}

function lastInteractions(state: BlipState): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const interaction of state.users?.recent_interactions ?? []) {
    const userId = interaction.peer_id?.user_id;
    const when = toDate(interaction.time);
    if (!userId || !when) continue;
    const existing = map.get(userId);
    if (!existing || existing < when) map.set(userId, when);
  }
  return map;
}

export function toPerson(state: BlipState, user: User, interactions = lastInteractions(state)): PersonRecipient {
  const devices = Object.values(user.devices ?? {});
  return {
    kind: "person",
    id: user.user_id,
    title: user.name || user.email || "Unknown",
    email: user.email ?? "",
    user,
    onlineDevices: devices.filter((d) => d.reach?.is_online).length,
    lastInteraction: interactions.get(user.user_id),
    isContact: Boolean(state.users?.contacts?.[user.user_id]),
    peer: { user_id: user.user_id },
  };
}

/** Contacts sorted by most recent interaction, then name. */
export function contacts(state: BlipState): PersonRecipient[] {
  const interactions = lastInteractions(state);
  const discovered = state.users?.discovered ?? {};
  return Object.keys(state.users?.contacts ?? {})
    .map((id) => discovered[id])
    .filter((u): u is User => Boolean(u) && !u.is_self)
    .map((u) => toPerson(state, u, interactions))
    .sort((a, b) => {
      const at = a.lastInteraction?.getTime() ?? 0;
      const bt = b.lastInteraction?.getTime() ?? 0;
      if (at !== bt) return bt - at;
      return a.title.localeCompare(b.title);
    });
}

export function peerLabel(state: BlipState, peer: PeerId | undefined): string {
  if (!peer?.user_id) return "Unknown";
  const me = state.auth?.user_id;
  const user = state.users?.discovered?.[peer.user_id];
  if (peer.user_id === me) {
    const device = peer.device_id ? user?.devices?.[peer.device_id] : undefined;
    return device?.name || "one of your devices";
  }
  return user?.name || user?.email || "Unknown";
}

export function resolveRecipient(state: BlipState, peer: PeerId | undefined): Recipient | undefined {
  if (!peer?.user_id) return undefined;
  if (peer.user_id === state.auth?.user_id) {
    return myDevices(state).find((d) => d.id === peer.device_id);
  }
  const user = state.users?.discovered?.[peer.user_id];
  return user ? toPerson(state, user) : undefined;
}

// ---- Transfers ----

export const ACTIVE_STATUSES: TransferStatus[] = [
  "Created",
  "InviteRequested",
  "Invited",
  "Pending",
  "Active",
  "Paused",
  "ResumeRequested",
];

export interface TransferView {
  transfer: Transfer;
  id: string;
  incoming: boolean;
  status: TransferStatus;
  active: boolean;
  itemNames: string[];
  title: string;
  totalBytes: number;
  transferredBytes: number;
  fraction: number;
  peerName: string;
  updatedAt?: Date;
  savePath?: string;
  error?: string;
  /** True when the transfer waits for you to accept it. */
  needsAcceptance: boolean;
}

export function describeTransfer(state: BlipState, transfer: Transfer): TransferView {
  const items = transfer.archive_stub?.items ?? {};
  const itemNames = Object.keys(items).sort((a, b) => a.localeCompare(b));
  const totalBytes = Object.values(items).reduce(
    (sum, item) => sum + (item.file?.size ?? item.folder_stub?.size ?? 0),
    0,
  );
  const status = transfer.status ?? "UnknownStatus";
  const transferred = status === "Completed" ? totalBytes : (transfer.progress ?? 0);
  const incoming = transfer.direction === "Incoming";
  const err = transfer.local_err ?? transfer.remote_err;
  let savePath: string | undefined;
  if (transfer.unpack_state) {
    try {
      savePath = (JSON.parse(transfer.unpack_state) as { unpackPath?: string }).unpackPath;
    } catch {
      savePath = undefined;
    }
  }
  return {
    transfer,
    id: transfer.transfer_id,
    incoming,
    status,
    active: ACTIVE_STATUSES.includes(status),
    itemNames,
    title: summarizeItems(itemNames),
    totalBytes,
    transferredBytes: transferred,
    fraction: totalBytes > 0 ? Math.min(1, transferred / totalBytes) : status === "Completed" ? 1 : 0,
    peerName: peerLabel(state, transfer.peer_id),
    updatedAt: toDate(transfer.updated_at),
    savePath,
    error: err?.msg || (err?.code && err.code !== "Unknown" ? humanizeErrorCode(err.code) : undefined),
    needsAcceptance: incoming && status === "Invited",
  };
}

export function summarizeItems(names: string[]): string {
  if (names.length === 0) return "Empty transfer";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} more`;
}

function humanizeErrorCode(code: string): string {
  const map: Record<string, string> = {
    UnpackNoSpace: "Not enough disk space on the receiving side",
    UnpackNoPermission: "No permission to write to the save folder",
    UnpackNotExist: "The save folder does not exist",
    UnpackNoVolume: "The save volume is not available",
    UnpackIntegrity: "The received data failed an integrity check",
    PackNoPermission: "No permission to read a file",
    PackNotExist: "A file no longer exists",
    PackNoVolume: "A source volume is not available",
    PackIntegrity: "A file changed while sending",
    Connection: "Connection lost",
    UserCancel: "Cancelled",
    UserDecline: "Declined by the recipient",
    UserRevokeInvite: "Invitation withdrawn",
    UserPause: "Paused",
  };
  return map[code] ?? code;
}

export function transfers(state: BlipState): TransferView[] {
  return Object.values(state.transfers ?? {})
    .map((t) => describeTransfer(state, t))
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}

export function statusLabel(view: TransferView): string {
  switch (view.status) {
    case "Created":
      return "Preparing";
    case "InviteRequested":
    case "Invited":
      return view.incoming ? "Accept?" : "Waiting";
    case "Pending":
      return "Connecting";
    case "Active":
      return `${Math.round(view.fraction * 100)}%`;
    case "Paused":
      return "Paused";
    case "ResumeRequested":
      return "Resuming";
    case "Completed":
      return "Done";
    case "Cancelled":
      return view.error && view.error !== "Cancelled" ? "Failed" : "Cancelled";
    default:
      return view.status;
  }
}

// ---- Actions ----

export interface SendSummary {
  count: number;
  bytes: number;
  label: string;
}

export function summarizeFiles(paths: string[]): SendSummary {
  let bytes = 0;
  let folders = 0;
  for (const p of paths) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) folders += 1;
      else bytes += stat.size;
    } catch {
      // Missing files are reported by Blip when it packs them.
    }
  }
  const names = paths.map((p) => path.basename(p));
  const what =
    paths.length === 1
      ? names[0]
      : folders === paths.length
        ? pluralize(paths.length, "folder")
        : pluralize(paths.length, "item");
  const size = folders > 0 ? "" : ` (${formatBytes(bytes)})`;
  return { count: paths.length, bytes, label: `${what}${size}` };
}

/**
 * Creates a transfer, attaches the files, and invites the peer.
 * Returns the transfer id so callers can follow progress in the state.
 */
export async function sendFiles(paths: string[], peer: PeerId): Promise<string> {
  const transferId = randomUUID().toUpperCase();
  await dispatch("TransferCreateRequested", { transfer_id: transferId, peer_id: peer });
  await dispatch("TransferAddContentRequested", { transfer_id: transferId, locations: paths });
  await waitForContent(transferId, paths.length);
  await dispatch("TransferInviteRequested", { transfer_id: transferId, peer_id: peer });
  return transferId;
}

async function waitForContent(transferId: string, expected: number): Promise<void> {
  const deadline = Date.now() + 5000;
  let last: StateSnapshotLike | undefined;
  while (Date.now() < deadline) {
    const snapshot = await getState(last?.id, 1500).catch(() => undefined);
    if (snapshot) {
      last = snapshot;
      const t = snapshot.state.transfers?.[transferId];
      const count = Object.keys(t?.archive_stub?.items ?? {}).length;
      if (t && count >= expected) return;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

interface StateSnapshotLike {
  id: number;
}

export function defaultSavePath(state: BlipState, preference: string | undefined): string {
  if (preference && preference.trim()) return preference;
  if (state.config?.custom_default_save_path) return state.config.custom_default_save_path;
  return path.join(os.homedir(), "Downloads");
}

export function receivedItemPaths(view: TransferView): string[] {
  if (!view.savePath) return [];
  return view.itemNames.map((name) => path.join(view.savePath as string, name)).filter((p) => fs.existsSync(p));
}
