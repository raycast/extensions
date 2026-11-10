import { existsSync } from "fs";
import { APP_CANDIDATES } from "./constants";
import { PlistNotFoundError, readProfilesPlist } from "./plist";
import { parseProfiles, requireProfiles } from "./profiles";
import { ProfileUsage } from "./types";

export function findApp(): string | undefined {
  return APP_CANDIDATES.find((candidate) => existsSync(candidate));
}

/** Reads the latest usage the menu bar app saved for every profile. */
export async function loadUsage(): Promise<ProfileUsage[]> {
  const appInstalled = findApp() !== undefined;
  try {
    const { profiles, activeProfileId } = await readProfilesPlist();
    return requireProfiles(parseProfiles(profiles, activeProfileId), appInstalled);
  } catch (error) {
    if (error instanceof PlistNotFoundError) return requireProfiles([], appInstalled);
    throw error;
  }
}
