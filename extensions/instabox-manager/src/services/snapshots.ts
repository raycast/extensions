import { CreateSnapshotRequest, Snapshot } from "../types";
import { machinePath, request } from "./instabox";

export async function listSnapshots() {
  const { snapshots } = await request<{ snapshots: Snapshot[] }>("GET", "/v1/snapshots");
  return snapshots;
}

export function getSnapshot(id: string) {
  return request<Snapshot>("GET", `/v1/snapshots/${encodeURIComponent(id)}`);
}

export function createSnapshot(machineId: string, body: CreateSnapshotRequest) {
  return request<Snapshot>("POST", machinePath(machineId, "/snapshots"), { body, idempotent: true });
}

export function deleteSnapshot(id: string) {
  return request<void>("DELETE", `/v1/snapshots/${encodeURIComponent(id)}`, { idempotent: true });
}

const SNAPSHOT_TIMEOUT_MS = 30 * 60 * 1000;

/** Polls a `pending` snapshot (a live snapshot that is still uploading) until it is `ready` or `failed`. */
export async function waitForSnapshot(snapshot: Snapshot) {
  const deadline = Date.now() + SNAPSHOT_TIMEOUT_MS;
  let current = snapshot;
  while (current.status === "pending") {
    if (Date.now() > deadline) throw new Error("Timed out waiting for the snapshot; it may still finish on InstaBox");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    current = await getSnapshot(current.id);
  }
  if (current.status === "failed") throw new Error(current.error || "The snapshot failed");
  return current;
}
