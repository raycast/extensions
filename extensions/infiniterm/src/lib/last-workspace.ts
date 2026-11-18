import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";

// A file in the extension's support directory, not LocalStorage: that throws in some Raycast runtimes
// ("localStorage is not available"). Remembering the choice must never get in the way of opening the folder.
function file(): string {
  return join(environment.supportPath, "last-workspace");
}

export function readLastWorkspace(): string | undefined {
  try {
    return readFileSync(file(), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

export function writeLastWorkspace(id: string): void {
  try {
    writeFileSync(file(), id);
  } catch {
    // not remembered
  }
}
