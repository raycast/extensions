/** Turns raw Blip state into what the UI shows: recipients and transfer rows. */
import {
  DeviceKind,
  TransferDirection,
  TransferStatus,
  type BlipState,
  type PeerId,
  type Transfer,
  type TransferErr,
  type User,
} from "./types";

export interface Recipient {
  /** Stable key: "userId" for people, "userId/deviceId" for your own devices. */
  key: string;
  peerId: PeerId;
  kind: "own-device" | "person";
  name: string;
  subtitle: string;
  deviceKind?: number;
  isOnline: boolean;
  /** Unix ms of the last transfer with this recipient, for ordering. */
  lastInteraction?: number;
}

export function recipientKey(peer: PeerId) {
  return peer.device_id ? `${peer.user_id}/${peer.device_id}` : peer.user_id;
}

function tsToMs(ts?: { seconds: string; nanos: number }) {
  return ts ? Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1e6) : undefined;
}

function allUsers(state: BlipState): User[] {
  return Object.values(state.users?.discovered ?? {});
}

/** `users.contacts` maps user ids to true; `is_contact` on the user is set too, but not always. */
function isContact(state: BlipState, user: User) {
  return user.is_contact || state.users?.contacts?.[user.user_id] === true;
}

function findUser(state: BlipState, userId: string): User | undefined {
  return allUsers(state).find((user) => user.user_id === userId);
}

/** Your other devices first, then people. Recent interactions bubble up within each group. */
export function listRecipients(state: BlipState): Recipient[] {
  const myUserId = state.auth?.user_id;
  const myDeviceId = state.auth?.device_id;

  const lastSeen = new Map<string, number>();
  for (const interaction of state.users?.recent_interactions ?? []) {
    if (!interaction.peer_id) continue;
    const time = tsToMs(interaction.time) ?? 0;
    for (const key of [recipientKey(interaction.peer_id), interaction.peer_id.user_id]) {
      lastSeen.set(key, Math.max(lastSeen.get(key) ?? 0, time));
    }
  }

  const recipients: Recipient[] = [];
  for (const user of allUsers(state)) {
    if (user.user_id === myUserId || user.is_self) {
      for (const device of Object.values(user.devices ?? {})) {
        if (device.device_id === myDeviceId || device.is_self) continue;
        const peerId = { user_id: user.user_id, device_id: device.device_id };
        recipients.push({
          key: recipientKey(peerId),
          peerId,
          kind: "own-device",
          name: device.name || "Unnamed Device",
          subtitle: "Your device",
          deviceKind: device.kind,
          isOnline: Boolean(device.reach?.is_online),
          lastInteraction: lastSeen.get(recipientKey(peerId)),
        });
      }
    } else if (isContact(state, user)) {
      // Blip addresses other people by user only; it delivers to their devices itself.
      const peerId = { user_id: user.user_id, device_id: "" };
      recipients.push({
        key: recipientKey(peerId),
        peerId,
        kind: "person",
        name: user.name || user.email || "Unknown Person",
        subtitle: user.email,
        isOnline: Object.values(user.devices ?? {}).some((device) => device.reach?.is_online),
        lastInteraction: lastSeen.get(user.user_id),
      });
    }
  }

  const rank = (r: Recipient) => (r.kind === "own-device" ? 0 : 1);
  return recipients.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (b.lastInteraction ?? 0) - (a.lastInteraction ?? 0) ||
      Number(b.isOnline) - Number(a.isOnline) ||
      a.name.localeCompare(b.name),
  );
}

/** Whether a remembered recipient is still reachable: the device still exists, or the person is still known. */
export function recipientExists(state: BlipState, peerId: PeerId) {
  const user = findUser(state, peerId.user_id);
  if (!user) return false;
  return peerId.device_id ? Boolean(user.devices?.[peerId.device_id]) : true;
}

/** People found by a server search (not already contacts). */
export function searchResults(state: BlipState, searchId: string): Recipient[] {
  const search = state.searches?.[searchId];
  if (!search) return [];
  const seen = new Set<string>();
  const results: Recipient[] = [];
  for (const peer of [...search.local_results, ...search.server_results]) {
    if (seen.has(peer.user_id) || peer.user_id === state.auth?.user_id) continue;
    seen.add(peer.user_id);
    const user = findUser(state, peer.user_id);
    const peerId = { user_id: peer.user_id, device_id: "" };
    results.push({
      key: recipientKey(peerId),
      peerId,
      kind: "person",
      name: user?.name || user?.email || "Blip User",
      subtitle: user?.email ?? "",
      isOnline: Object.values(user?.devices ?? {}).some((device) => device.reach?.is_online),
    });
  }
  return results;
}

export function deviceKindLabel(kind?: number) {
  switch (kind) {
    case DeviceKind.Phone:
      return "Phone";
    case DeviceKind.Tablet:
      return "Tablet";
    case DeviceKind.Laptop:
      return "Laptop";
    case DeviceKind.Desktop:
      return "Desktop";
    default:
      return "Device";
  }
}

// ---------- Transfers ----------

export interface TransferRow {
  transfer: Transfer;
  id: string;
  title: string;
  totalBytes: number;
  fraction?: number;
  peerName: string;
  incoming: boolean;
  statusLabel: string;
  isActive: boolean;
  /** Not finished: preparing, waiting, connecting, transferring or paused. */
  isOpen: boolean;
  isFinishedOk: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  /** Finished, or stuck before it ever started (e.g. Blip didn't respond while it was being created). */
  canRemove: boolean;
  needsResponse: boolean;
  errorMessage?: string;
  updatedAt?: number;
  localPaths: string[];
}

function itemBytes(item: { file?: { size: string }; folder_stub?: { size: string } }) {
  return Number(item.file?.size ?? item.folder_stub?.size ?? 0);
}

export function statusLabel(t: Transfer): string {
  const incoming = t.direction === TransferDirection.Incoming;
  switch (t.status) {
    case TransferStatus.Created:
      return "Preparing";
    case TransferStatus.InviteRequested:
    case TransferStatus.Invited:
      return incoming ? "Waiting for You" : "Waiting for Recipient";
    case TransferStatus.Pending:
      return "Connecting";
    case TransferStatus.Active:
      return incoming ? "Receiving" : "Sending";
    case TransferStatus.Paused:
      return "Paused";
    case TransferStatus.ResumeRequested:
      return "Resuming";
    case TransferStatus.Completed:
      return incoming ? "Received" : "Sent";
    case TransferStatus.Cancelled:
      return t.local_err?.code === 401 || t.remote_err?.code === 401 ? "Declined" : "Canceled";
    default:
      return "Unknown";
  }
}

/** Pause, cancel, decline and revoke are recorded as "errors" too (codes 400–403); they aren't failures. */
const USER_ACTION_CODES = new Set([400, 401, 402, 403]);

/**
 * A failure is an error that isn't a user action and that stopped the transfer: Blip marks it fatal,
 * or the transfer ended up canceled. Non-fatal errors (e.g. a dropped connection Blip retries) aren't shown.
 */
function failure(t: Transfer, error?: TransferErr) {
  if (!error || !(error.code || error.msg) || USER_ACTION_CODES.has(error.code)) return undefined;
  return error.fatal || t.status === TransferStatus.Cancelled ? error : undefined;
}

/** The failure message for a transfer, if it actually failed. */
export function transferError(t: Transfer): string | undefined {
  const error = failure(t, t.local_err) ?? failure(t, t.remote_err);
  return error ? error.msg || `Blip error ${error.code}` : undefined;
}

export function toTransferRow(state: BlipState, t: Transfer): TransferRow {
  // Protobuf maps have no fixed order; sort so titles don't change between updates.
  const items = Object.entries(t.archive_stub?.items ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const totalBytes = items.reduce((sum, [, item]) => sum + itemBytes(item), 0);
  const progressBytes = Number(t.progress || 0);
  const incoming = t.direction === TransferDirection.Incoming;
  const peerUser = t.peer_id ? findUser(state, t.peer_id.user_id) : undefined;
  const peerDevice = t.peer_id?.device_id ? peerUser?.devices?.[t.peer_id.device_id] : undefined;
  const isSelf = t.peer_id?.user_id === state.auth?.user_id;
  const peerName = (isSelf && peerDevice?.name) || peerUser?.name || peerUser?.email || "Unknown";
  const active = ([TransferStatus.Pending, TransferStatus.Active, TransferStatus.ResumeRequested] as number[]).includes(
    t.status,
  );
  const open = !([TransferStatus.Completed, TransferStatus.Cancelled] as number[]).includes(t.status);
  const firstName = items[0]?.[0] ?? "Transfer";

  return {
    transfer: t,
    id: t.transfer_id,
    title: items.length > 1 ? `${firstName} + ${items.length - 1} more` : firstName,
    totalBytes,
    fraction:
      t.status === TransferStatus.Completed ? 1 : totalBytes > 0 ? Math.min(1, progressBytes / totalBytes) : undefined,
    peerName,
    incoming,
    statusLabel: transferError(t) ? "Failed" : statusLabel(t),
    isActive: active,
    isOpen: open,
    isFinishedOk: t.status === TransferStatus.Completed,
    canPause: active,
    canResume: t.status === TransferStatus.Paused && t.is_resumable,
    canCancel: open && t.status !== TransferStatus.Created,
    canRemove: !open || t.status === TransferStatus.Created,
    needsResponse: incoming && (t.status === TransferStatus.Invited || t.status === TransferStatus.InviteRequested),
    errorMessage: transferError(t),
    updatedAt: tsToMs(t.updated_at),
    localPaths: Object.entries(t.archive_stub?.disk_locations ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, path]) => path),
  };
}

export function listTransfers(state: BlipState): TransferRow[] {
  return Object.values(state.transfers ?? {})
    .map((t) => toTransferRow(state, t))
    .sort((a, b) => Number(b.needsResponse) - Number(a.needsResponse) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1000)));
  return `${(bytes / 1000 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(kbps?: number) {
  if (!kbps) return undefined;
  const mbps = kbps / 1000;
  return mbps >= 1 ? `${mbps.toFixed(0)} Mbps` : `${kbps.toFixed(0)} kbps`;
}
