import { createNewTabToWebsite, createNewWindow } from "../actions";
import { runAppleScript } from "run-applescript";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type Input = {
  /** The website we should open a new window to, if one is provided. */
  website?: string;
  /** The search query to search for, if one is provided. */
  query?: string;
  /** The profile name to use for the new window. */
  profile?: string;
};

// Check if a profile exists in Comet's Local State
function getExistingProfiles(): string[] {
  try {
    const localStatePath = join(homedir(), "Library/Application Support/Comet/Local State");
    const localStateContent = readFileSync(localStatePath, "utf8");
    const localState = JSON.parse(localStateContent);
    return Object.keys(localState.profile?.info_cache || {});
  } catch (error) {
    return [];
  }
}

// Get the profile name from directory name
function getProfileName(profileDir: string): string | null {
  try {
    const localStatePath = join(homedir(), "Library/Application Support/Comet/Local State");
    const localStateContent = readFileSync(localStatePath, "utf8");
    const localState = JSON.parse(localStateContent);
    const profileInfo = localState.profile?.info_cache?.[profileDir];
    return profileInfo?.name || null;
  } catch (error) {
    return null;
  }
}

async function createNewWindowWithProfile(profile: string, url?: string): Promise<void> {
  const targetUrl = url || "about:blank";

  // Try different approaches for profile targeting
  try {
    // First try with profile directory argument
    await runAppleScript(`
      do shell script "open -na 'Comet' --args --profile-directory='${profile}' '${targetUrl}'"
    `);
  } catch (error) {
    // Fallback: use AppleScript to create window then navigate
    await runAppleScript(`
      tell application "Comet"
        make new window
        activate
        open location "${targetUrl}"
      end tell
    `);
  }
}

export default async function (input: Input) {
  // Default to google.com
  const defaultWebsite = input.website || "https://google.com";

  // Check if requested profile exists, otherwise use current profile (no specific profile)
  let targetProfile: string | null = null;
  let profileDisplayName = "current";

  if (input.profile) {
    const existingProfiles = getExistingProfiles();

    // Check if the requested profile exists (by directory name or display name)
    const profileByDir = existingProfiles.find((dir) => dir === input.profile);
    const profileByName = existingProfiles.find((dir) => {
      const name = getProfileName(dir);
      return name?.toLowerCase() === input.profile?.toLowerCase();
    });

    if (profileByDir) {
      targetProfile = profileByDir;
      profileDisplayName = getProfileName(profileByDir) || profileByDir;
    } else if (profileByName) {
      targetProfile = profileByName;
      profileDisplayName = getProfileName(profileByName) || profileByName;
    }
    // If profile doesn't exist, targetProfile remains null (will use current profile)
  }

  // If a query is provided, search with Perplexity
  if (input.query) {
    const perplexityUrl = `https://perplexity.ai/search?q=${encodeURIComponent(input.query)}`;

    if (targetProfile) {
      await createNewWindowWithProfile(targetProfile, perplexityUrl);
      return `Searching "${input.query}" with Perplexity in new window (profile: ${profileDisplayName})`;
    } else {
      await createNewTabToWebsite(perplexityUrl);
      return `Searching "${input.query}" with Perplexity in new window (profile: ${profileDisplayName})`;
    }
  }

  // If a website is provided or using default, open it with profile
  if (targetProfile) {
    await createNewWindowWithProfile(targetProfile, defaultWebsite);
    return `Opening new window to ${defaultWebsite} (profile: ${profileDisplayName})`;
  } else {
    await createNewWindow();
    return `Opening new window to ${defaultWebsite} (profile: ${profileDisplayName})`;
  }
}
