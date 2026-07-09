import { readFile } from "fs/promises";
import { existsSync } from "fs";

export interface Space {
  id: number;
  index: number;
  name: string;
  isCurrent: boolean;
  displayUUID: string;
  displayIndex: number;
  icon: string | null;
  colorIndex: number | null;
  colorHex: string;
}

export const STATE_FILE = "/tmp/spacejump-state.json";

export async function getSpaces(): Promise<Space[]> {
  if (!existsSync(STATE_FILE)) {
    throw new Error("SpaceJump state file not found. Is SpaceJump running?");
  }
  const data = await readFile(STATE_FILE, "utf-8");
  return JSON.parse(data);
}
