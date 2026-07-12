import { environment, trash } from "@raycast/api";
import { join } from "node:path";
import { LEDGER_DIRECTORY } from "../domain/constants";
import type { GroundPacketDraft, GroundPacketRecord } from "../domain/types";
import {
  appendCorrectionInDirectory,
  appendGroundPacketInDirectory,
  deleteGroundPacketInDirectory,
  listGroundPacketsInDirectory,
} from "./ledger-file";

function directory(): string {
  return join(environment.supportPath, LEDGER_DIRECTORY);
}

export function listGroundPackets(): Promise<GroundPacketRecord[]> {
  return listGroundPacketsInDirectory(directory());
}

export function appendGroundPacket(record: GroundPacketRecord): Promise<void> {
  return appendGroundPacketInDirectory(directory(), record);
}

export function appendCorrection(
  base: GroundPacketRecord,
  draft: GroundPacketDraft,
): Promise<GroundPacketRecord> {
  return appendCorrectionInDirectory(directory(), base, draft);
}

export function deleteGroundPacket(id: string): Promise<void> {
  return deleteGroundPacketInDirectory(directory(), id, trash);
}
