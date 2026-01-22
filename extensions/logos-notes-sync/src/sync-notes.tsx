import { getPreferenceValues, showHUD, closeMainWindow } from "@raycast/api";
import { fetchAllNotes, isAuthenticated } from "./api";
import { processNotes, groupNotesByResource, writeNotesToObsidian } from "./utils";
import { sendToReadwise } from "./readwise";
import { Preferences } from "./types";
import { log, logError, clearLog } from "./logger";

export default async function Command() {
  // Close Raycast window immediately
  await closeMainWindow();

  clearLog();
  log("=== Sync Notes Command Started ===");

  const preferences = getPreferenceValues<Preferences>();
  log("Preferences loaded", {
    obsidianVaultPath: preferences.obsidianVaultPath,
    excludedResources: preferences.excludedResources,
    includeHighlightColor: preferences.includeHighlightColor,
  });

  // Check if authenticated
  const authenticated = await isAuthenticated();
  log(`Authentication check: ${authenticated}`);

  if (!authenticated) {
    await showHUD("❌ Not logged in. Run 'Login to Logos' first");
    return;
  }

  // Validate output path
  if (!preferences.obsidianVaultPath) {
    log("ERROR: No obsidian vault path configured");
    await showHUD("❌ Please set Obsidian vault path in preferences");
    return;
  }

  try {
    log("Starting to fetch notes...");

    // Fetch all notes
    const notes = await fetchAllNotes((fetched, total) => {
      log(`Progress: ${fetched}/${total}`);
    });

    log(`Fetch complete. Total notes: ${notes.length}`);

    // Process and group notes
    log("Processing notes...");
    const processedNotes = processNotes(notes);
    log(`Processed ${processedNotes.length} notes`);

    const notesByResource = groupNotesByResource(processedNotes);
    log(`Grouped into ${notesByResource.size} resources`);

    // Parse excluded resources
    const excludedResources = preferences.excludedResources
      ? preferences.excludedResources.split(",").map((r) => r.trim())
      : [];
    log(`Excluded resources: ${excludedResources.join(", ") || "(none)"}`);

    // Write to Obsidian
    let filesWritten = 0;
    let notesWritten = 0;

    if (preferences.obsidianVaultPath) {
      log(`Writing to: ${preferences.obsidianVaultPath}`);
      const result = writeNotesToObsidian(
        notesByResource,
        preferences.obsidianVaultPath,
        preferences.includeHighlightColor ?? true,
        excludedResources,
      );
      filesWritten = result.filesWritten;
      notesWritten = result.notesWritten;
    }

    // Send to Readwise if enabled
    let readwiseSent = 0;
    if (preferences.syncToReadwise && preferences.readwiseToken) {
      log("Sending to Readwise...");
      const readwiseResult = await sendToReadwise(processedNotes, preferences.readwiseToken);
      readwiseSent = readwiseResult.sent;
    }

    log(`=== Sync Complete ===`);
    log(`Files written: ${filesWritten}, Notes written: ${notesWritten}, Readwise: ${readwiseSent}`);

    // Build completion message
    const parts: string[] = [];
    if (notesWritten > 0) {
      parts.push(`${notesWritten} notes to ${filesWritten} files`);
    }
    if (readwiseSent > 0) {
      parts.push(`${readwiseSent} to Readwise`);
    }

    await showHUD(`✓ Synced ${parts.join(", ")}`);
  } catch (error) {
    logError("Sync failed", error);
    await showHUD(`❌ Sync failed. Check ~/logos-notes-sync.log`);
  }
}
