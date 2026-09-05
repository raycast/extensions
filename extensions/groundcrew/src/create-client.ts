import { getPreferenceValues } from "@raycast/api";

import { createGroundcrewClient, type GroundcrewClient } from "./cli";

/**
 * Creates a Groundcrew client from the extension preferences.
 *
 * Raycast runs extensions with a stripped environment (a bare PATH and none of
 * your shell exports), so `crew` — and the `node`/`git`/`cmux`/`gh` it shells out
 * to — may not resolve. Point the Groundcrew Executable Path preference at a small
 * shim that restores that environment; see the extension README.
 */
export async function createGroundcrewClientFromPreferences(): Promise<GroundcrewClient> {
  const { crewPath } = getPreferenceValues<Preferences>();
  return createGroundcrewClient({
    ...(crewPath?.trim() ? { executablePath: crewPath.trim() } : {}),
  });
}
