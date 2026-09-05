import { LaunchType, Toast, environment, showToast } from "@raycast/api";
import { scanShortcuts } from "./lib/drive-shortcuts";
import { loadShortcutIndex, saveShortcutIndex } from "./lib/shortcut-index";
import { scanSharedFolders } from "./lib/shared-scan";
import { loadSharedIndex, saveSharedIndex } from "./lib/shared-index";
import { withIndexingLock } from "./lib/indexing-lock";
import {
  driveIndexCaveat,
  shouldReplaceIndex,
  shouldSaveCheckpoint,
} from "./lib/index-refresh";

/** Incrementally indexes Google Drive content that Spotlight cannot see. */
export default async function Command() {
  await withIndexingLock(async (assertOwned) => {
    const interactive = environment.launchType === LaunchType.UserInitiated;
    const toast = interactive
      ? await showToast({
          style: Toast.Style.Animated,
          title: "Indexing Google Drive…",
          message: "Reading the parts Spotlight cannot see.",
        })
      : undefined;

    const previousShortcuts = await loadShortcutIndex();
    const shortcuts = await scanShortcuts({
      onProgress: async (partial) => {
        if (shouldSaveCheckpoint(previousShortcuts.shortcuts.length)) {
          assertOwned();
          await saveShortcutIndex(partial);
        }
        if (toast)
          toast.message = `${partial.shortcuts.length} shortcuts so far…`;
      },
    });
    if (
      shouldReplaceIndex(
        previousShortcuts.shortcuts.length,
        shortcuts.available,
      )
    ) {
      assertOwned();
      await saveShortcutIndex(shortcuts);
    }
    if (!shortcuts.available) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Google Drive is unavailable";
        toast.message = "The previous index was kept.";
      }
      return;
    }

    const previousShared = loadSharedIndex();
    const shared = await scanSharedFolders({
      onProgress: (partial) => {
        if (shouldSaveCheckpoint(previousShared.paths.length)) {
          assertOwned();
          saveSharedIndex(partial);
        }
        if (toast)
          toast.message = `${partial.paths.length} items in shared folders…`;
      },
    });
    if (shouldReplaceIndex(previousShared.paths.length, shared.available)) {
      assertOwned();
      saveSharedIndex(shared);
    }

    if (!shared.available) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Google Drive shared folders are unavailable";
        toast.message = "The previous index was kept.";
      }
      return;
    }

    if (toast) {
      const indexCaveat = driveIndexCaveat(shortcuts, shared);
      toast.style = Toast.Style.Success;
      toast.title = `Indexed ${shared.paths.length} items in shared folders`;
      toast.message = indexCaveat
        ? `${shortcuts.shortcuts.length} shortcuts. ${indexCaveat}.`
        : `${shortcuts.shortcuts.length} shortcuts. All searchable by name now.`;
    }
  });
}
