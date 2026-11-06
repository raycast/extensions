import { showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface SpaceEntry {
  id: string;
  name: string;
  number?: number;
  isActive: boolean;
  isFullscreen: boolean;
  apps: string[];
  note?: string;
  color?: string;
}

// Direct download build, then the sandboxed Mac App Store build's container.
const STATE_PATHS = [
  join(homedir(), "Library", "Application Support", "Spacepal", "state.json"),
  join(
    homedir(),
    "Library",
    "Containers",
    "com.halberd.spacepal",
    "Data",
    "Library",
    "Application Support",
    "Spacepal",
    "state.json",
  ),
];

/** The Space list Spacepal writes, or null when no readable list exists (Spacepal not installed or never run). */
export function loadSpaces(): SpaceEntry[] | null {
  for (const path of STATE_PATHS) {
    try {
      const state = JSON.parse(readFileSync(path, "utf8"));
      if (Array.isArray(state.spaces)) return state.spaces as SpaceEntry[];
    } catch {
      // try the next location
    }
  }
  return null;
}

// "open -g" hands the link to Spacepal without bringing it to the front, so the window that was in
// front before Raycast opened stays the front window ("Move Window to Space" moves that one).
export async function run(command: string) {
  try {
    await new Promise<void>((resolve, reject) =>
      execFile("/usr/bin/open", ["-g", `spacepal://${command}`], (error) => (error ? reject(error) : resolve())),
    );
  } catch {
    await showHUD("Spacepal is not installed");
  }
}
