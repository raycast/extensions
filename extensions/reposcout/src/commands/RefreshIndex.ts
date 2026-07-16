import { environment, LaunchType, showToast, Toast } from "@raycast/api";
import { createFileIndexStore } from "../cache/index-store";
import { indexFilePath } from "../cache/paths";
import { refreshIndex } from "../indexer/indexer";
import { loadPreferences } from "../preferences/preferences";
import { mergeRoots } from "../preferences/roots";
import { loadStoredRoots } from "../preferences/roots-store";
import { createLogger } from "../utils/logger";

const log = createLogger("refresh-command");

/**
 * The `Refresh Repository Index` background command. Raycast runs this on the
 * interval declared in package.json and on demand. It performs a full
 * discover + incremental-enrich pass and persists the updated index.
 */
export default async function RefreshIndex(): Promise<void> {
  const preferences = loadPreferences();
  const store = createFileIndexStore(indexFilePath(environment.supportPath));

  // Effective roots = preference roots ∪ in-app roots (LocalStorage).
  const roots = mergeRoots(preferences.discovery.roots, await loadStoredRoots());

  // Opt-in scanning: with no configured roots there is nothing to index, and we
  // must not overwrite an existing cache with an empty scan. See ADR-010.
  if (roots.length === 0) {
    log.info("skipping background refresh: no search roots configured");
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folders to search",
        message: "Open RepoScout and add folders to search, or set them in preferences.",
      });
    }
    return;
  }

  try {
    const index = await refreshIndex({
      discovery: { ...preferences.discovery, roots },
      store,
    });
    log.info(`background refresh indexed ${index.records.length} repositories`);
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Success,
        title: "RepoScout",
        message: `Indexed ${index.records.length} repositories`,
      });
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    log.error("background refresh failed", message);
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({ style: Toast.Style.Failure, title: "Refresh failed", message });
    }
  }
}
