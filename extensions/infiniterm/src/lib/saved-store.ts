import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { parseSaved, type SavedCommand } from "./saved.ts";

// A file in the extension's support directory, not LocalStorage: that throws in some Raycast runtimes.
function file(): string {
  return join(environment.supportPath, "saved-commands.json");
}

export function readSaved(): SavedCommand[] {
  try {
    return parseSaved(readFileSync(file(), "utf8"));
  } catch {
    return [];
  }
}

// Throws when the write fails, so the caller can say the command was not saved. The list goes to a temporary
// file first and is renamed over the old one, so a full disk or an interrupted write cannot empty the saved list.
export function writeSaved(list: SavedCommand[]): void {
  mkdirSync(environment.supportPath, { recursive: true });
  const tmp = `${file()}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(list, null, 2));
    renameSync(tmp, file());
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}
