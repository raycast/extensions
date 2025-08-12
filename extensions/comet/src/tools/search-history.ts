import { getAvailableProfiles } from "../util";

type Input = {
  /** The query to search for in the history (optional, returns recent history if empty) */
  query?: string;
  /** The profile to search in (optional, defaults to "Default") */
  profile?: string;
};

export default function (input: Input) {
  try {
    // For now, return a message directing users to use the Raycast command instead
    // This avoids the WASM dependency while maintaining the tool interface
    const availableProfiles = getAvailableProfiles();
    const profileInfo = input.profile ? `in profile "${input.profile}"` : "in the default profile";
    const queryInfo = input.query ? `for "${input.query}"` : "(recent history)";

    return `To search Comet history ${queryInfo} ${profileInfo}, please use the "Search History" command in Raycast. Available profiles are: ${availableProfiles.join(
      ", "
    )}.`;
  } catch (error) {
    const availableProfiles = getAvailableProfiles();
    return `Error: ${
      error instanceof Error ? error.message : "Unknown error occurred"
    }. Available profiles are: ${availableProfiles.join(", ")}. Try using one of these profile names.`;
  }
}
