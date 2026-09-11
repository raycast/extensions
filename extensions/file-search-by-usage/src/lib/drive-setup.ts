import {
  LaunchType,
  LocalStorage,
  Toast,
  environment,
  showToast,
} from "@raycast/api";
import { scanShortcuts } from "./drive-shortcuts";
import { loadShortcutIndex, saveShortcutIndex } from "./shortcut-index";
import { scanSharedFolders } from "./shared-scan";
import { loadSharedIndex, saveSharedIndex } from "./shared-index";
import { withIndexingLock } from "./indexing-lock";
import { setupProgress } from "./setup-progress";
import {
  driveIndexCaveat,
  shouldReplaceIndex,
  shouldSaveCheckpoint,
} from "./index-refresh";

export const DRIVE_SETUP_KEY = "google-drive-setup";
export type DriveSetupOptions = {
  signal?: AbortSignal;
  budgetMs?: number;
  onProgress?: (message: string) => void;
  onSummary?: (message: string) => void;
};

/** Incrementally indexes Google Drive content that Spotlight cannot see. */
export async function indexGoogleDrive(options: DriveSetupOptions = {}) {
  return withIndexingLock((assertOwned) =>
    indexGoogleDriveLocked(assertOwned, options),
  );
}

/** Caller holds the indexing lock for the entire scan and all writes. */
export async function indexGoogleDriveLocked(
  assertOwned: () => void,
  options: DriveSetupOptions = {},
): Promise<
  "complete" | "partial" | "unavailable" | "cancelled" | "storage-error"
> {
  if (options.signal?.aborted) return "cancelled";
  const interactive = environment.launchType === LaunchType.UserInitiated;
  const toast = interactive
    ? await showToast({
        style: Toast.Style.Animated,
        title: "Indexing Google Drive…",
        message: "Reading the parts Spotlight cannot see.",
      })
    : undefined;

  const previousShortcuts = await loadShortcutIndex();
  const finish = <T extends string>(result: T) => {
    options.onSummary?.(
      toast
        ? toast.title + ". " + (toast.message ?? "")
        : "Google Drive: " + result,
    );
    return result;
  };
  const progress = setupProgress((message) => {
    if (toast) toast.message = message;
    options.onProgress?.(message);
  });
  progress.phase("Google Drive shortcuts", options.budgetMs ?? 240_000);
  try {
    const shortcuts = await scanShortcuts({
      signal: options.signal,
      budgetMs: options.budgetMs,
      onProgress: async (partial) => {
        if (options.signal?.aborted) return;
        if (shouldSaveCheckpoint(previousShortcuts.shortcuts.length)) {
          assertOwned();
          await saveShortcutIndex(partial);
        }
        progress.update(`${partial.shortcuts.length} shortcuts found`);
      },
    });
    const stopped = () => {
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Google Drive indexing stopped";
        toast.message =
          "Saved progress was kept. Use Actions → Set Up Search or run Index Google Drive to retry.";
      }
      return "cancelled" as const;
    };
    if (options.signal?.aborted) return stopped();
    const replaceShortcuts = shouldReplaceIndex(
      previousShortcuts.shortcuts.length,
      shortcuts.shortcuts.length,
      shortcuts.available,
      shortcuts.partial,
      previousShortcuts.partial,
    );
    if (replaceShortcuts) {
      assertOwned();
      await saveShortcutIndex(shortcuts);
    }
    if (!shortcuts.available) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Google Drive is unavailable";
        toast.message = "The previous index was kept.";
      }
      return finish("unavailable");
    }

    const previousShared = loadSharedIndex();
    progress.phase("Google Drive shared folders", options.budgetMs ?? 120_000);
    const shared = await scanSharedFolders({
      signal: options.signal,
      budgetMs: options.budgetMs,
      onProgress: (partial) => {
        if (options.signal?.aborted) return;
        if (shouldSaveCheckpoint(previousShared.paths.length)) {
          assertOwned();
          saveSharedIndex(partial);
        }
        progress.update(`${partial.paths.length} items found`);
      },
    });
    if (options.signal?.aborted) return stopped();
    const replaceShared = shouldReplaceIndex(
      previousShared.paths.length,
      shared.paths.length,
      shared.available,
      shared.partial,
      previousShared.partial,
    );
    if (replaceShared) {
      assertOwned();
      if (!saveSharedIndex(shared)) {
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Google Drive index could not be saved";
          toast.message =
            "The shared-folder cache could not be updated. Previous saved results were kept; setup remains available to retry.";
        }
        return finish("storage-error");
      }
    }

    if (!shared.available) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Google Drive shared folders are unavailable";
        toast.message = "The previous index was kept.";
      }
      return finish("unavailable");
    }

    const complete = !shortcuts.partial && !shared.partial;
    assertOwned();
    await LocalStorage.setItem(DRIVE_SETUP_KEY, complete ? "done" : "partial");
    if (toast) {
      const indexCaveat = driveIndexCaveat(shortcuts, shared);
      toast.style = Toast.Style.Success;
      if (!replaceShortcuts || !replaceShared) {
        const kept = [
          !replaceShortcuts && "shortcut",
          !replaceShared && "shared-folder",
        ]
          .filter(Boolean)
          .join(" and ");
        toast.title = "Google Drive refresh incomplete";
        toast.message = `Previous ${kept} index kept. ${indexCaveat}.`;
      } else {
        toast.title = `Indexed ${shared.paths.length} items in shared folders`;
        toast.message = indexCaveat
          ? `${shortcuts.shortcuts.length} shortcuts. ${indexCaveat}.`
          : `${shortcuts.shortcuts.length} shortcuts. All searchable by name now.`;
      }
    }
    return finish(complete ? "complete" : "partial");
  } finally {
    progress.stop();
  }
}
