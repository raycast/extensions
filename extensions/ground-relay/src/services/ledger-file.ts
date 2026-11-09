import {
  readLedger,
  appendRecord,
  recordPath,
  withLineageLock,
  requireLatest,
} from "./ledger-core";
import { groundRecord } from "../domain/validation-common";
import type { GroundPacketRecord } from "../domain/types";
export function inspectGroundPacketsInDirectory(directory: string) {
  return readLedger<GroundPacketRecord>(directory, groundRecord);
}
export async function listGroundPacketsInDirectory(
  directory: string,
): Promise<GroundPacketRecord[]> {
  return (await inspectGroundPacketsInDirectory(directory)).records;
}
export async function appendGroundPacketInDirectory(
  directory: string,
  record: GroundPacketRecord,
): Promise<void> {
  await appendRecord(directory, record, groundRecord);
}
export async function deleteGroundPacketInDirectory(
  directory: string,
  id: string,
  moveToTrash: (path: string) => Promise<void>,
): Promise<void> {
  await moveToTrash(recordPath(directory, id)).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}
import { createGroundPacket } from "../domain/packet";
import type { GroundPacketDraft } from "../domain/types";
export async function appendCorrectionInDirectory(
  directory: string,
  base: GroundPacketRecord,
  draft: GroundPacketDraft,
): Promise<GroundPacketRecord> {
  return withLineageLock(directory, base.rootId, async () => {
    const latest = requireLatest(
      await inspectGroundPacketsInDirectory(directory),
      base,
    );
    const record = createGroundPacket(draft, {
      rootId: latest.rootId,
      version: latest.version + 1,
      supersedesId: latest.id,
    });
    await appendGroundPacketInDirectory(directory, record);
    return record;
  });
}
