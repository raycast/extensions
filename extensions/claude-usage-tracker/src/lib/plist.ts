import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { ACTIVE_PROFILE_KEY, PLIST_PATH, PROFILES_KEY } from "./constants";

const execFileAsync = promisify(execFile);

export class PlistNotFoundError extends Error {
  constructor() {
    super("Claude Usage has not saved any data yet");
    this.name = "PlistNotFoundError";
  }
}

/** Reads one top-level value with `plutil`; `Data` values come back base64-encoded. */
async function extract(path: string, key: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-extract", key, "raw", "-o", "-", path], {
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.trim() || undefined;
  } catch {
    // plutil exits non-zero when the key does not exist.
    return undefined;
  }
}

export interface RawProfiles {
  /** The decoded `profiles_v3` JSON, or undefined when the app has no profiles yet. */
  profiles: unknown;
  activeProfileId?: string;
}

/**
 * Reads the profile list from the app's preferences. `profiles_v3` is a `Data` value holding
 * UTF-8 JSON (the app encodes its Codable models into UserDefaults), so it is decoded twice.
 */
export async function readProfilesPlist(path: string | null = PLIST_PATH): Promise<RawProfiles> {
  if (!path || !existsSync(path)) throw new PlistNotFoundError();
  const [encoded, activeProfileId] = await Promise.all([
    extract(path, PROFILES_KEY),
    extract(path, ACTIVE_PROFILE_KEY),
  ]);
  if (!encoded) return { profiles: undefined, activeProfileId };
  const json = Buffer.from(encoded, "base64").toString("utf8");
  try {
    return { profiles: JSON.parse(json), activeProfileId };
  } catch {
    throw new Error("Could not decode the profiles saved by Claude Usage");
  }
}
