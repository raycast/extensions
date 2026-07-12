import { environment } from "@raycast/api";
import { join } from "node:path";
import { LEDGER_DIRECTORY } from "../domain/constants";
import type { GroundPacketRecord } from "../domain/types";
import {
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

export function deleteGroundPacket(id: string): Promise<void> {
  return deleteGroundPacketInDirectory(directory(), id);
}
