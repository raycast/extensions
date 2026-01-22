import { getPreferenceValues, showHUD, LocalStorage } from "@raycast/api";
import { fetchAllNotes, isAuthenticated } from "./api";
import { processNotes, groupNotesByResource, writeNotesToObsidian } from "./utils";
import { sendToReadwise } from "./readwise";
import { Preferences } from "./types";
import { log, logError, clearLog } from "./logger";

const LAST_SYNC_KEY = "last-background-sync";
const AUTH_WARNING_KEY = "auth-warning-shown";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Check if auto-sync is enabled
  if (!preferences.autoSyncEnabled) {
    log("Background sync: Auto-sync disabled, skipping");
    return;
  }

  clearLog();
  log("=== Background Sync Started ===");

  // Check if authenticated
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // Show warning if we haven't recently
    const lastWarning = await LocalStorage.getItem<string>(AUTH_WARNING_KEY);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    if (!lastWarning || parseInt(lastWarning, 10) < oneDayAgo) {
      await showHUD("⚠️ Logos auth expired. Run 'Login to Logos' to continue syncing.");
      await LocalStorage.setItem(AUTH_WARNING_KEY, now.toString());
    }

    log("Background sync: Not authenticated");
    return;
  }

  // Clear auth warning flag since we're authenticated
  await LocalStorage.removeItem(AUTH_WARNING_KEY);

  try {
    log("Background sync: Fetching notes...");

    const notes = await fetchAllNotes();
    log(`Background sync: Fetched ${notes.length} notes`);

    const processedNotes = processNotes(notes);
    const notesByResource = groupNotesByResource(processedNotes);

    const excludedResources = preferences.excludedResources
      ? preferences.excludedResources.split(",").map((r) => r.trim())
      : [];

    // Write to Obsidian
    let filesWritten = 0;
    let notesWritten = 0;

    if (preferences.obsidianVaultPath) {
      const result = writeNotesToObsidian(
        notesByResource,
        preferences.obsidianVaultPath,
        preferences.includeHighlightColor ?? true,
        excludedResources,
      );
      filesWritten = result.filesWritten;
      notesWritten = result.notesWritten;
    }

    // Send to Readwise
    let readwiseSent = 0;
    if (preferences.syncToReadwise && preferences.readwiseToken) {
      const readwiseResult = await sendToReadwise(processedNotes, preferences.readwiseToken);
      readwiseSent = readwiseResult.sent;
    }

    // Record last sync time
    await LocalStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    log(`=== Background Sync Complete ===`);
    log(`Files: ${filesWritten}, Notes: ${notesWritten}, Readwise: ${readwiseSent}`);

    // Silent success - no HUD for background syncs unless there's something notable
  } catch (error) {
    logError("Background sync failed", error);
    // Don't spam user with HUD notifications for background failures
    // They can check the log if needed
  }
}
