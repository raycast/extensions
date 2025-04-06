import { showToast, Toast, environment, LocalStorage } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./preferences";
import { promises as fs } from "fs";
import { fetchEnvelopesFromCLI, fetchFoldersFromCLI } from "./control";
import { Envelope } from "./models"; // Assuming Envelope type is defined in ./models

export default async function Command() {
  const isRunningInBackground = environment.launchType === "background";
  const preferences = getPreferenceValues<Preferences>();

  try {
    await fs.access(preferences.binaryPath);
  } catch {
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Binary not found",
      });
    }
    return;
  }

  try {
    // Show toast that sync is starting (only if not in background)
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Syncing data",
      });
    }

    // First, fetch all folders
    const folders = await fetchFoldersFromCLI(preferences);

    // Create a progress toast if not in background
    let progressToast: Toast | undefined;
    if (!isRunningInBackground) {
      progressToast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching emails",
        message: "Starting...",
      });
    }

    // Fetch envelopes for each folder
    const allEnvelopes: Record<string, Envelope> = {};
    let totalEnvelopes = 0;

    // Process folders one by one
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];

      // Update progress toast
      if (!isRunningInBackground && progressToast) {
        // Create a new toast instead of updating the existing one
        progressToast = await showToast({
          style: Toast.Style.Animated,
          title: "Fetching emails",
          message: `Folder ${i + 1}/${folders.length}: ${folder.name}`,
        });
      }

      try {
        // Fetch envelopes for this folder
        const folderEnvelopes = await fetchEnvelopesFromCLI(preferences, folder.name);

        // Add each envelope to our collection, using ID as key to avoid duplicates
        folderEnvelopes.forEach((envelope) => {
          // Only add if we don't already have this envelope, or if we're replacing with a non-INBOX folder
          // This prioritizes non-INBOX folder assignments when emails appear in multiple folders
          if (
            !allEnvelopes[envelope.id] ||
            (allEnvelopes[envelope.id].folder_name === "INBOX" && envelope.folder_name !== "INBOX")
          ) {
            allEnvelopes[envelope.id] = envelope;
          }
        });

        totalEnvelopes += folderEnvelopes.length;
      } catch (folderError) {
        console.error(`Error fetching envelopes for folder ${folder.name}:`, folderError);
        // Continue with other folders even if one fails
      }
    }

    // Convert the record back to an array
    const envelopes = Object.values(allEnvelopes);

    // Store the current timestamp for both
    const syncTimestamp = new Date().toISOString();

    // Update storage with the fetched data and timestamps
    await LocalStorage.setItem("envelopes", JSON.stringify(envelopes));
    await LocalStorage.setItem("folders", JSON.stringify(folders));
    await LocalStorage.setItem("lastSync", syncTimestamp);
    await LocalStorage.setItem("lastFolderSync", syncTimestamp);

    // Show success toast (only if not in background)
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Success,
        title: "Sync completed",
        message: `${envelopes.length} unique envelopes from ${totalEnvelopes} total (${folders.length} folders)`,
      });
    }
  } catch (syncError) {
    console.error("Sync error:", syncError);
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync failed",
        message: syncError instanceof Error ? syncError.message : String(syncError),
      });
    }
  }
}
