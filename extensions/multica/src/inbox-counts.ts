import { LaunchType, environment, launchCommand, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchInboxCounts } from "./lib/inbox-counts";

/**
 * Runs in the background to keep this command's root-search subtitle showing
 * each workspace's unread count. Launching it by hand refreshes and opens My Inbox.
 */
export default async function InboxCounts() {
  const userInitiated = environment.launchType === LaunchType.UserInitiated;

  try {
    const counts = await fetchInboxCounts();
    const subtitle = counts.length
      ? counts.map(({ workspace, count }) => `${workspace.name} ${count}`).join(" · ")
      : "No workspaces";
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    await updateCommandMetadata({ subtitle: "Couldn't load inbox counts" });
    if (userInitiated) await showFailureToast(error, { title: "Couldn't load inbox counts" });
    return;
  }

  if (userInitiated) await launchCommand({ name: "inbox", type: LaunchType.UserInitiated });
}
