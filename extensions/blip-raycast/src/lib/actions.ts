/**
 * High-level Blip actions built on Dispatch. Everything here runs without opening Blip's UI.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { getClient, type BlipClient } from "./client";
import type { PeerId } from "./types";

export function newTransferId() {
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
  { transferId = newTransferId(), client = getClient() }: { transferId?: string; client?: BlipClient } = {},
) {
  if (locations.length === 0) throw new Error("Nothing to send.");
  const missing = locations.filter((path) => !existsSync(path));
  if (missing.length) throw new Error(`Not found: ${missing.join(", ")}`);

  const peerId = { user_id: peer.user_id, device_id: peer.device_id };
  await client.dispatch("event.TransferCreateRequested", { transfer_id: transferId, peer_id: peerId });
  try {
    await client.dispatch("event.TransferAddContentRequested", { transfer_id: transferId, locations });
    await client.dispatch("event.TransferInviteRequested", { transfer_id: transferId, peer_id: peerId });
  } catch (error) {
    // Don't leave a half-built transfer (and its window) behind.
    await client
      .dispatch("event.TransferRemoveRequested", { transfer_id: transferId, delete_files: false })
      .catch(() => {});
    throw error;
  } finally {
    await client.dispatch("event.TransferDismiss", { transfer_id: transferId }).catch(() => {});
  }
  return transferId;
}

const transferEvent =
  (eventName: string) =>
  (transferId: string, client: BlipClient = getClient()) =>
    client.dispatch(eventName, { transfer_id: transferId });

export const pauseTransfer = transferEvent("event.TransferPauseRequested");
export const resumeTransfer = transferEvent("event.TransferResume");
export const cancelTransfer = transferEvent("event.TransferCancellationRequested");
export const declineTransfer = transferEvent("event.TransferDeclineRequested");
export const dismissTransfer = transferEvent("event.TransferDismiss");

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
