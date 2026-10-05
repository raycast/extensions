import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { showError } from "./lib/errors";
import { backgroundRefreshEnabled, buildIndex, IndexAbortedError, IndexBusyError, isIndexing } from "./lib/index";

export default async function Command() {
  const manual = environment.launchType === LaunchType.UserInitiated;
  // The scheduled run is opt-in: a full crawl lists every folder of the Drive.
  if (!manual && !backgroundRefreshEnabled()) return;
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
    if (manual) await showError(error, "Indexing failed");
    else console.error(error);
  }
}
