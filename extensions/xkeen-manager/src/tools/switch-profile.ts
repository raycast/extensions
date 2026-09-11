import { Tool } from "@raycast/api";
import { formatTrafficVerification, verifyTrafficPath } from "../lib/health";
import { applyProfile, loadProfilesData, validateProfileName } from "../lib/profiles";

type Input = {
  /**
   * The name of the xkeen server profile to switch to. Must match an
   * existing profile name exactly (case-sensitive).
   */
  profileName: string;
};

// Shared by `confirmation` and the tool itself so an unknown profile name
// never reaches `applyProfile` — it fails with the list of valid names
// before any confirmation is shown or any switch is attempted.
async function assertProfileExists(profileName: string): Promise<void> {
  const nameErr = validateProfileName(profileName);
  if (nameErr) throw new Error(nameErr);

  const { names } = await loadProfilesData();
  if (!names.includes(profileName)) {
    const available = names.length > 0 ? names.join(", ") : "none";
    throw new Error(`Profile "${profileName}" not found. Available profiles: ${available}`);
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  await assertProfileExists(input.profileName);
  return {
    message: `Switch to profile "${input.profileName}" and restart xkeen? Network will briefly drop.`,
  };
};

/**
 * Switch xkeen to another server profile and restart it. Network access
 * briefly drops while xkeen restarts.
 */
export default async function tool(input: Input) {
  await assertProfileExists(input.profileName);
  await applyProfile(input.profileName);

  const verification = await verifyTrafficPath()
    .then(formatTrafficVerification)
    .catch(() => "unavailable");

  return {
    switched: true,
    profile: input.profileName,
    verification,
  };
}
