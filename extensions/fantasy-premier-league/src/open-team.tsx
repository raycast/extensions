import { open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { entryUrl, fetchEntry } from "./api/fpl";
import { getTeamId } from "./hooks";

export default async function Command() {
  const teamId = getTeamId();
  if (!teamId) {
    await showToast({ style: Toast.Style.Failure, title: "Set your FPL Team ID in the extension preferences" });
    await openExtensionPreferences();
    return;
  }
  try {
    const entry = await fetchEntry(teamId);
    await open(entryUrl(teamId, entry.current_event));
  } catch {
    await open(entryUrl(teamId));
  }
}
