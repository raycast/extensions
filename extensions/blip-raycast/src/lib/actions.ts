/**
 * High-level Blip actions built on Dispatch. Everything here runs without opening Blip's UI.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { getClient, type BlipClient } from "./client";
import { DrpcTimeoutError } from "./drpc";
import { transferError } from "./model";
import { TransferStatus, type PeerId } from "./types";

export function newId() {
  return randomUUID().toUpperCase();
}

/**
 * Sends files/folders to a peer.
 *
 * Blip opens a transfer window whenever a transfer is created; dispatching
 * create → add → invite → dismiss back to back closes it before it is ever drawn.
 * Dismissing only hides the window: the transfer continues and stays in history.
 */
export async function sendLocations(
  peer: PeerId,
  locations: string[],
  { transferId = newId(), client = getClient() }: { transferId?: string; client?: BlipClient } = {},
) {
  if (locations.length === 0) throw new Error("Nothing to send.");
  const missing = locations.filter((path) => !existsSync(path));
  if (missing.length) throw new Error(`Not found: ${missing.join(", ")}`);

  const peerId = { user_id: peer.user_id, device_id: peer.device_id };
  let inviteAttempted = false;
  const invite = () => {
    inviteAttempted = true;
    return client.dispatch("event.TransferInviteRequested", { transfer_id: transferId, peer_id: peerId });
  };
  const remove = () =>
    client.dispatch("event.TransferRemoveRequested", { transfer_id: transferId, delete_files: false }).catch(() => {});
  try {
    await client.dispatch("event.TransferCreateRequested", { transfer_id: transferId, peer_id: peerId });
    await client.dispatch("event.TransferAddContentRequested", { transfer_id: transferId, locations });
    await invite();
  } catch (error) {
    if (!(error instanceof DrpcTimeoutError)) {
      await remove(); // Don't leave a half-built transfer (and its window) behind.
      throw error;
    }
    // Blip was too slow to answer but may have done it anyway: look, then finish the send or undo it.
    const outcome = await finishAfterTimeout(client, transferId, invite, remove, () => inviteAttempted);
    if (outcome === "undone") throw new Error("Blip didn't respond in time, so nothing was sent. Try again.");
    if (outcome === "unknown") {
      throw new Error("Blip didn't confirm the send. Check Manage Transfers before sending it again.");
    }
  } finally {
    await client.dispatch("event.TransferDismiss", { transfer_id: transferId }).catch(() => {});
  }
  await confirmStarted(client, transferId);
  return transferId;
}

/**
 * After a timeout: "sent" when the transfer is (now) on its way, "undone" when it was removed, and
 * "unknown" when Blip can't be checked after the invite already went out. Then it may well have been
 * delivered, so it's neither removed nor reported as unsent (retrying could send it twice).
 */
async function finishAfterTimeout(
  client: BlipClient,
  transferId: string,
  invite: () => Promise<void>,
  remove: () => Promise<void>,
  /** Read live: the recovery below may send the invite itself before failing. */
  inviteAttempted: () => boolean,
): Promise<"sent" | "undone" | "unknown"> {
  try {
    const transfer = (await client.getState()).state.transfers?.[transferId];
    if (!transfer) return "undone";
    if (transfer.status !== TransferStatus.Created) return "sent";
    if (Object.keys(transfer.archive_stub?.items ?? {}).length > 0) {
      await invite();
      return "sent";
    }
  } catch {
    if (inviteAttempted()) return "unknown";
    // The invite never went out: undo below so nothing is left half-built.
  }
  await remove();
  return "undone";
}

const CONFIRM_MS = 2000;

/**
 * Blip checks the files after the invite (e.g. it can't read one). Wait briefly for the transfer
 * to get past "created", and report a failure right away instead of only in Manage Transfers.
 * By now the invite has gone out, so anything other than a failure Blip reports for this transfer
 * (a slow or unreachable Blip) is not treated as a failed send: it shows up in Manage Transfers.
 */
async function confirmStarted(client: BlipClient, transferId: string) {
  const deadline = Date.now() + CONFIRM_MS;
  let lastId: string | undefined;
  for (;;) {
    let snapshot;
    try {
      const remaining = deadline - Date.now();
      if (lastId && remaining <= 0) return;
      snapshot = await client.getState(lastId ? { lastId, timeoutMs: remaining } : {});
    } catch {
      return;
    }
    lastId = snapshot.id;
    const transfer = snapshot.state.transfers?.[transferId];
    const error = transfer && transferError(transfer);
    if (error) throw new Error(error);
    if (transfer && transfer.status !== TransferStatus.Created) return;
  }
}

const transferEvent =
  (eventName: string) =>
  (transferId: string, client: BlipClient = getClient()) =>
    client.dispatch(eventName, { transfer_id: transferId });

export const pauseTransfer = transferEvent("event.TransferPauseRequested");
export const resumeTransfer = transferEvent("event.TransferResume");
export const cancelTransfer = transferEvent("event.TransferCancellationRequested");
export const declineTransfer = transferEvent("event.TransferDeclineRequested");

export function acceptTransfer(transferId: string, savePath = "", client: BlipClient = getClient()) {
  return client.dispatch("event.TransferAcceptanceRequested", { transfer_id: transferId, save_path: savePath });
}

export function removeTransfer(transferId: string, deleteFiles: boolean, client: BlipClient = getClient()) {
  return client.dispatch("event.TransferRemoveRequested", { transfer_id: transferId, delete_files: deleteFiles });
}

export function setAutoAccept(enabled: boolean, client: BlipClient = getClient()) {
  return client.dispatch("event.TransferSetAutoAccept", { auto_accept: enabled });
}

export function setSaveToPhotos(enabled: boolean, client: BlipClient = getClient()) {
  return client.dispatch("event.TransferSetAutoSaveToMediaLibrary", { auto_save: enabled });
}

/** Empty path restores Blip's default (Downloads). */
export function setDefaultSavePath(path: string, client: BlipClient = getClient()) {
  return client.dispatch("event.TransferSetCustomDefaultSavePath", { path });
}

/** 0 means unlimited. */
export function setSpeedLimits(limits: { uploadMbps: number; downloadMbps: number }, client: BlipClient = getClient()) {
  return client.dispatch("event.TransferSetSpeedLimits", {
    upload_mbps: limits.uploadMbps,
    download_mbps: limits.downloadMbps,
  });
}

export function startSearch(id: string, query: string, client: BlipClient = getClient()) {
  return client.dispatch("event.Search", { id, query });
}

export function abandonSearch(id: string, client: BlipClient = getClient()) {
  return client.dispatch("event.AbandonSearch", { id });
}
