import { readFile } from "fs/promises";

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
  let data: string;
  try {
    data = await readFile(STATE_FILE, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("SpaceJump state file not found. Is SpaceJump running?");
    }
    throw err;
  }
  return JSON.parse(data);
}
