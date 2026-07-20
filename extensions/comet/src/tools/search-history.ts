import { getAvailableProfiles, resolveProfileName, getHistory } from "../util";
import { HistoryEntry } from "../interfaces";

type Input = {
  /** The query to search for in the history (optional, returns recent history if empty) */
  query?: string;
  /** The profile to search in (optional, defaults to "Default") */
  profile?: string;
};

export default async function (input: Input): Promise<HistoryEntry[] | string> {
  try {
    // Resolve profile name (e.g., "Johan" -> "Default")
    const resolvedProfile = resolveProfileName(input.profile);
    const history = await getHistory(resolvedProfile, input.query);

    return history;
  } catch (error) {
    const availableProfiles = getAvailableProfiles();
    return `Error: ${
      error instanceof Error ? error.message : "Unknown error occurred"
    }. Available profiles are: ${availableProfiles.join(", ")}. Try using one of these profile names.`;
  }
}
