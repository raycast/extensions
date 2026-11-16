import { accessSync, constants, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const MANIFEST_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Mozilla",
  "NativeMessagingHosts",
  "raycast_firefox.json"
);

/**
 * Whether Firefox can launch the native host: the manifest exists, names
 * `raycast_firefox`, and points at an executable `run.sh`.
 */
export function isNativeHostRegistered(manifestPath: string = MANIFEST_PATH): boolean {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as { name?: string; path?: string };
    if (manifest.name !== "raycast_firefox" || !manifest.path) return false;
    accessSync(manifest.path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
