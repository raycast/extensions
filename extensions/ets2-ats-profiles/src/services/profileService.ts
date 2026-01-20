import { showToast, Toast, trash } from "@raycast/api";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { decryptSii, hexToString, stringToHex } from "./siiService";

export enum Game {
  ATS = "American Truck Simulator",
  ETS2 = "Euro Truck Simulator 2",
}

export type Profile = {
  name: string;
  hexName: string;
  path: string;
};

export async function getProfiles(game: Game) {
  const profiles: Profile[] = [];
  const home = homedir();
  const profilesPath = path.join(home, "Documents", game, "profiles");

  if (!fs.existsSync(profilesPath)) {
    showToast({
      title: "Profiles not found",
      message: `No profiles found for ${game}.`,
      style: Toast.Style.Failure,
    });
  }

  const files = fs.readdirSync(profilesPath);
  for (const file of files) {
    const filePath = path.join(profilesPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const name = hexToString(file);
      if (name) {
        const profileDataPath = path.join(filePath, "profile.sii");
        await decryptSii(profileDataPath);
        profiles.push({ name, hexName: file, path: filePath });
      }
    }
  }

  return profiles;
}

/**
 * Validates a profile name
 *
 * @param name - Profile name to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateProfileName(name: string): { isValid: boolean; error?: string } {
  // Check if empty or only whitespace
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Profile name cannot be empty" };
  }

  // Check for leading/trailing spaces
  if (name !== name.trim()) {
    return { isValid: false, error: "Profile name cannot have leading or trailing spaces" };
  }

  // Check length (reasonable limits)
  if (name.length > 50) {
    return { isValid: false, error: "Profile name cannot exceed 50 characters" };
  }

  // Check for invalid characters (Windows/filesystem unsafe characters)
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return { isValid: false, error: "Profile name contains invalid characters" };
  }

  // Check for reserved Windows names
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(name)) {
    return { isValid: false, error: "Profile name cannot be a reserved system name" };
  }

  return { isValid: true };
}

/**
 * Deletes a profile by removing its directory
 *
 * @param profile - Profile to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteProfile(profile: Profile): Promise<void> {
  try {
    // Remove the entire profile directory
    fs.rmSync(profile.path, { recursive: true, force: true });

    showToast({
      title: "Profile Deleted",
      message: `Profile "${profile.name}" has been deleted`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    showToast({
      title: "Deletion Failed",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    throw new Error(`Failed to delete profile: ${errorMessage}`);
  }
}

/**
 * Duplicates a profile by copying the entire profile directory and updating the profile name
 *
 * @param profile - Profile to duplicate
 * @param game - Game type
 * @returns Promise that resolves when duplication is complete
 */
export async function duplicateProfile(profile: Profile, game: Game): Promise<void> {
  const newName = `${profile.name} Copy`;
  const validation = validateProfileName(newName);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const home = homedir();
  const profilesPath = path.join(home, "Documents", game, "profiles");
  const newHexName = stringToHex(newName);
  const newProfilePath = path.join(profilesPath, newHexName);

  // Check if a profile with the new name already exists
  if (fs.existsSync(newProfilePath)) {
    throw new Error("A profile with this name already exists");
  }

  try {
    // Step 1: Copy the entire profile directory
    fs.cpSync(profile.path, newProfilePath, { recursive: true });

    // Step 2: Update the profile.sii file in the new directory
    const newProfileSiiPath = path.join(newProfilePath, "profile.sii");

    // Decrypt the profile.sii file (if encrypted)
    await decryptSii(newProfileSiiPath);

    // Read the profile.sii file
    let siiContent = fs.readFileSync(newProfileSiiPath, "utf-8");

    // Update the profile_name field using regex
    const profileNameRegex = /profile_name:\s*"[^"]*"/;
    if (!profileNameRegex.test(siiContent)) {
      throw new Error("Could not find profile_name field in profile.sii");
    }

    siiContent = siiContent.replace(profileNameRegex, `profile_name: "${newName}"`);

    // Write the updated content back to the file
    fs.writeFileSync(newProfileSiiPath, siiContent, "utf-8");

    showToast({
      title: "Profile Duplicated",
      message: `Profile "${profile.name}" duplicated as "${newName}"`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    // Clean up if duplication failed
    if (fs.existsSync(newProfilePath)) {
      try {
        await trash(newProfilePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    showToast({
      title: "Duplication Failed",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    throw new Error(`Failed to duplicate profile: ${errorMessage}`);
  }
}

/**
 * Renames a profile by updating the profile.sii file and renaming its directory
 *
 * @param profile - Profile to rename
 * @param newName - New name for the profile
 * @param game - Game type
 * @returns Promise that resolves when rename is complete
 */
export async function renameProfile(profile: Profile, newName: string, game: Game): Promise<void> {
  const validation = validateProfileName(newName);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const home = homedir();
  const profilesPath = path.join(home, "Documents", game, "profiles");
  const newHexName = stringToHex(newName);
  const newProfilePath = path.join(profilesPath, newHexName);

  // Check if a profile with the new name already exists
  if (fs.existsSync(newProfilePath)) {
    throw new Error("A profile with this name already exists");
  }

  const profileSiiPath = path.join(profile.path, "profile.sii");

  try {
    // Step 1: Decrypt the profile.sii file (if encrypted)
    await decryptSii(profileSiiPath);

    // Step 2: Read the profile.sii file
    let siiContent = fs.readFileSync(profileSiiPath, "utf-8");

    // Step 3: Update the profile_name field using regex
    const profileNameRegex = /profile_name:\s*"[^"]*"/;
    if (!profileNameRegex.test(siiContent)) {
      throw new Error("Could not find profile_name field in profile.sii");
    }

    siiContent = siiContent.replace(profileNameRegex, `profile_name: "${newName}"`);

    // Step 4: Write the updated content back to the file
    fs.writeFileSync(profileSiiPath, siiContent, "utf-8");

    // Step 5: Rename the directory
    fs.renameSync(profile.path, newProfilePath);

    showToast({
      title: "Profile Renamed",
      message: `Profile renamed from "${profile.name}" to "${newName}"`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    showToast({
      title: "Rename Failed",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    throw new Error(`Failed to rename profile: ${errorMessage}`);
  }
}
