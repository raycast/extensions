import { LocalStorage } from "@raycast/api";
import {
  DEFAULT_SETTINGS,
  IndexSettings,
  SETTINGS_KEY,
  parseSettings,
  parseSettingsResult,
  serializeSettings,
} from "./index-settings";
import {
  DataResetError,
  dataGeneration,
  withStorageLock,
} from "./storage-lock";
import { withIndexingLock } from "./indexing-lock";

/**
 * Raycast storage for the index settings.
 *
 * Split from index-settings.ts so the parsing and editing rules stay free of
 * `@raycast/api` and the harness can exercise them directly.
 */

export async function loadIndexSettings(): Promise<IndexSettings> {
  /*
   * Missing or malformed values safely parse as defaults. A storage read
   * failure is different: the rebuild must stop rather than use defaults as
   * evidence that the user's saved scopes were removed.
   */
  const raw = await LocalStorage.getItem<string>(SETTINGS_KEY);
  return parseSettings(typeof raw === "string" ? raw : undefined);
}

/** Rebuilds also need to know whether settings may authorize root deletion. */
export async function loadIndexSettingsForRebuild() {
  const raw = await LocalStorage.getItem<string>(SETTINGS_KEY);
  return parseSettingsResult(typeof raw === "string" ? raw : undefined);
}

/**
 * Why a save did not happen, so the screen can say the true thing.
 *
 * "reset" means a deletion ran while the editor was open and the edit belongs
 * to data that no longer exists. "failed" means the write itself did not work.
 * These were one `false` before, and the screen reported both as a reset, so an
 * ordinary write failure told the user their data had been erased.
 */
export type SaveOutcome = "saved" | "reset" | "failed";

export async function saveIndexSettings(
  settings: IndexSettings,
  generation = dataGeneration(),
): Promise<SaveOutcome> {
  // Same order as deletion: indexing lock, then the short storage lock.
  // Never let a settings write invalidate a running scan's cleanup scope.
  return (
    (await withIndexingLock(async (assertOwned): Promise<SaveOutcome> => {
      try {
        return await withStorageLock(async (assertCurrent) => {
          assertOwned();
          assertCurrent();
          await LocalStorage.setItem(SETTINGS_KEY, serializeSettings(settings));
          assertOwned();
          return "saved" as const;
        }, generation);
      } catch (error) {
        return error instanceof DataResetError ? "reset" : "failed";
      }
    }, "settings")) ?? "failed"
  );
}

export async function resetIndexSettings(): Promise<SaveOutcome> {
  return saveIndexSettings({ ...DEFAULT_SETTINGS });
}
