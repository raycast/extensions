import { open, showHUD } from "@raycast/api";
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

export function loadSpaces(): SpaceEntry[] {
  for (const path of STATE_PATHS) {
    try {
      const state = JSON.parse(readFileSync(path, "utf8"));
      return state.spaces as SpaceEntry[];
    } catch {
      // try the next location
    }
  }
  return [];
}

export async function run(command: string) {
  try {
    await open(`spacepal://${command}`);
  } catch {
    await showHUD("Spacepal is not running");
  }
}
