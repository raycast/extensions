import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Descriptor, Receipt, Snapshot } from "../src/lib/contract";

export const instance = "10000000-0000-4000-8000-000000000001";
export const epoch = "20000000-0000-4000-8000-000000000002";
export const taskID = "30000000-0000-4000-8000-000000000003";
export function descriptor(): Descriptor {
  return {
    schemaVersion: 1,
    accessPolicyVersion: 1,
    minimumReaderVersion: 1,
    enabled: true,
    producerInstanceID: instance,
    namespaceEpoch: epoch,
    appVersion: "1.4.12",
    appBuild: "64",
  };
}
export function snapshot(now = Date.now() / 1000): Snapshot {
  return {
    schemaVersion: 1,
    accessPolicyVersion: 1,
    minimumReaderVersion: 1,
    producerInstanceID: instance,
    namespaceEpoch: epoch,
    appVersion: "1.4.12",
    appBuild: "64",
    access: { state: "licensed", validUntil: now + 3600 },
    snapshotRevision: 4,
    generatedAt: now,
    lifecycle: "ready",
    dataHealth: "ready",
    capabilities: ["refreshState", "reviewAddURL", "showTask", "revealTask"],
    truncated: false,
    totalTaskCount: 1,
    tasks: [
      {
        taskID,
        taskRevision: 2,
        displayName: "report.pdf",
        state: "completed",
        engineKind: "direct",
        completedBytes: 10,
        totalBytes: 10,
        progress: 1,
        availableActions: ["showTask", "revealTask"],
        outputAvailability: "available",
      },
    ],
  };
}
export function receipt(
  requestID: string,
  status: Receipt["status"] = "succeeded",
): Receipt {
  return {
    schemaVersion: 1,
    requestID,
    namespaceEpoch: epoch,
    producerInstanceID: instance,
    payloadHash: "a".repeat(64),
    receiptRevision: 3,
    status,
    updatedAt: Date.now() / 1000,
  };
}
export async function jsonFile(root: string, name: string, value: unknown) {
  await writeFile(join(root, name), JSON.stringify(value), { mode: 0o600 });
}
export async function fixtureRoot() {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(join(parent, "harbordrop-raycast-"));
  await Promise.all([
    mkdir(join(root, "requests"), { mode: 0o700 }),
    mkdir(join(root, "receipts"), { mode: 0o700 }),
  ]);
  await jsonFile(root, "descriptor.json", descriptor());
  await jsonFile(root, "state.json", snapshot());
  return root;
}
export { randomUUID };
