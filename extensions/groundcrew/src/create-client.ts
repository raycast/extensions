import { getPreferenceValues } from "@raycast/api";

import { createGroundcrewClient, type GroundcrewClient } from "./cli";

/**
 * Creates a Groundcrew client from the extension preferences, injecting the
 * configured Additional PATH and Linear API key into crew's environment so it —
 * and the tools it shells out to — resolve under Raycast's stripped environment.
 */
export async function createGroundcrewClientFromPreferences(): Promise<GroundcrewClient> {
  const { crewPath, additionalPath, linearApiKey } = getPreferenceValues<Preferences>();
  return createGroundcrewClient({
    ...(crewPath?.trim() ? { executablePath: crewPath.trim() } : {}),
    ...(additionalPath?.trim() ? { additionalPath: additionalPath.trim() } : {}),
    ...(linearApiKey?.trim() ? { apiKey: linearApiKey.trim() } : {}),
  });
}
