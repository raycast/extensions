import { launchCommand, LaunchType, open } from "@raycast/api";
import { entryUrl, fetchEntry } from "./api/fpl";
import { getTeamId } from "./hooks";

export default async function Command() {
  const teamId = await getTeamId();
  // A no-view command cannot show a form, so My Team asks for the Team ID instead.
  if (!teamId) return launchCommand({ name: "my-team", type: LaunchType.UserInitiated });
  try {
    const entry = await fetchEntry(teamId);
    await open(entryUrl(teamId, entry.current_event));
  } catch {
    await open(entryUrl(teamId));
  }
}
