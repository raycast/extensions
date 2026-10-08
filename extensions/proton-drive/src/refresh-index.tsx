import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { showError } from "./lib/errors";
import { handleSignedOut, isSignedOut } from "./lib/session";
import { buildIndex, IndexAbortedError, IndexBusyError, isIndexing } from "./lib/index";

export default async function Command() {
  // Scheduled runs are controlled by Raycast's own Background Refresh toggle for this command.
  const manual = environment.launchType === LaunchType.UserInitiated;
  if (await isIndexing()) {
    if (manual) await showHUD("Proton Drive is already being indexed");
    return;
  }
  if (manual) await showHUD("Indexing Proton Drive…");
  try {
    const index = await buildIndex();
    await updateCommandMetadata({
      subtitle: `${index.entries.length} items · ${new Date(index.updatedAt).toLocaleTimeString()}`,
    });
    if (manual) await showHUD(`Indexed ${index.entries.length} items`);
  } catch (error) {
    if (error instanceof IndexBusyError) {
      if (manual) await showHUD("Proton Drive is already being indexed");
      return;
    }
    if (error instanceof IndexAbortedError) return;
    // The session ended outside the extension: delete local data, as every other command does.
    if (isSignedOut(error)) return handleSignedOut();
    if (manual) await showError(error, "Indexing failed");
    else console.error(error);
  }
}
