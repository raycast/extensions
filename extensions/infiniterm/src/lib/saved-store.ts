import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// Throws when the write fails, so the caller can say the command was not saved.
export function writeSaved(list: SavedCommand[]): void {
  mkdirSync(environment.supportPath, { recursive: true });
  writeFileSync(file(), JSON.stringify(list, null, 2));
}
