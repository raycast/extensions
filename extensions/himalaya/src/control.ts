import { execa } from "execa";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { z } from "zod";
import { Envelope, Folder } from "./models";
import { Preferences } from "./preferences";

/**
 * Fetches envelopes from the Himalaya CLI
 * @param preferences User preferences containing binary path and account
 * @param folder Optional folder name to fetch envelopes from
 * @returns Array of envelopes
 */
export async function fetchEnvelopesFromCLI(preferences: Preferences, folder?: string): Promise<Envelope[]> {
  const pageSize = 100;

  try {
    // Build command arguments
    const args = [
      "envelope",
      "list",
      "--account",
      preferences.defaultAccount,
      "--output",
      "json",
      "--page-size",
      `${pageSize}`,
    ];

    // Add folder parameter if specified
    if (folder) {
      args.push("--folder", folder);
    }

    // Execute the CLI command to list envelopes
    const result = await execa(preferences.binaryPath, args, {});

    // Parse the JSON response
    const parsedData = JSON.parse(result.stdout);
    const envelopes = z.array(Envelope).parse(parsedData);

    // Add folder_name to each envelope if a folder was specified
    if (folder) {
      envelopes.forEach((envelope) => {
        envelope.folder_name = folder;
      });
    }

    return envelopes;
  } catch (error) {
    console.error("Error fetching envelopes:", error);
    throw error;
  }
}

/**
 * Updates envelopes in LocalStorage and sets the lastSync timestamp
 * @param envelopes Array of envelopes to store
 */
export async function updateEnvelopesInStorage(envelopes: Envelope[]): Promise<void> {
  await LocalStorage.setItem("envelopes", JSON.stringify(envelopes));
  await LocalStorage.setItem("lastSync", new Date().toISOString());
}

/**
 * Loads envelopes from LocalStorage
 * @returns Object containing envelopes array and lastSync timestamp
 */
export async function loadEnvelopesFromStorage(): Promise<{ envelopes: Envelope[]; lastSync: string | null }> {
  const storedEnvelopes = await LocalStorage.getItem<string>("envelopes");
  const lastSync = await LocalStorage.getItem<string>("lastSync");

  return {
    envelopes: storedEnvelopes ? JSON.parse(storedEnvelopes) : [],
    lastSync: lastSync || null,
  };
}

/**
 * Gets the last sync timestamp from LocalStorage
 * @returns Date object of last sync or null if never synced
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const lastSync = await LocalStorage.getItem<string>("lastSync");
  return lastSync ? new Date(lastSync) : null;
}

/**
 * Deletes an envelope using the Himalaya CLI and updates localStorage
 * @param id ID of the envelope to delete
 * @param preferences User preferences
 * @param onSuccess Callback function to execute after successful deletion
 */
export async function deleteEnvelopeAndRefresh(
  id: string,
  preferences: Preferences,
  onSuccess: () => void,
): Promise<void> {
  try {
    // Show deleting toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting email...",
    });

    // Execute delete command - wait for this to complete first
    await execa(
      preferences.binaryPath,
      ["message", "delete", id, "--account", preferences.defaultAccount, "--output", "json"],
      {},
    );

    // Only after successful CLI deletion, update localStorage
    const { envelopes } = await loadEnvelopesFromStorage();
    const updatedEnvelopes = envelopes.filter((envelope) => envelope.id !== id);
    await updateEnvelopesInStorage(updatedEnvelopes);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Email deleted",
      message: "Email was successfully deleted",
    });

    // Call the success callback
    onSuccess();
  } catch (error) {
    console.error("Delete error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to delete email",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Fetches folders from the Himalaya CLI and updates LocalStorage
 * @param preferences User preferences containing binary path and account
 * @returns Array of folders
 */
export async function fetchFoldersFromCLI(preferences: Preferences): Promise<Folder[]> {
  try {
    // Execute the CLI command to list folders
    const result = await execa(
      preferences.binaryPath,
      ["folder", "list", "--account", preferences.defaultAccount, "--output", "json"],
      {},
    );

    // Parse the JSON response
    const parsedData = JSON.parse(result.stdout);
    const folders = z.array(Folder).parse(parsedData);

    // Update LocalStorage
    await updateFoldersInStorage(folders);

    return folders;
  } catch (error) {
    console.error("Error fetching folders:", error);
    throw error;
  }
}

/**
 * Updates folders in LocalStorage and sets the lastFolderSync timestamp
 * @param folders Array of folders to store
 */
export async function updateFoldersInStorage(folders: Folder[]): Promise<void> {
  await LocalStorage.setItem("folders", JSON.stringify(folders));
  await LocalStorage.setItem("lastFolderSync", new Date().toISOString());
}

/**
 * Loads folders from LocalStorage
 * @returns Object containing folders array and lastFolderSync timestamp
 */
export async function loadFoldersFromStorage(): Promise<{ folders: Folder[]; lastSync: string | null }> {
  const storedFolders = await LocalStorage.getItem<string>("folders");
  const lastSync = (await LocalStorage.getItem<string>("lastFolderSync")) || null;

  if (storedFolders) {
    try {
      const parsedFolders = JSON.parse(storedFolders);
      const folders = z.array(Folder).parse(parsedFolders);
      return { folders, lastSync };
    } catch (error) {
      console.error("Error parsing stored folders:", error);
    }
  }

  return { folders: [], lastSync: null };
}

/**
 * Moves an envelope to a different folder using the Himalaya CLI and updates localStorage
 * @param id ID of the envelope to move
 * @param targetFolder Target folder to move the envelope to
 * @param preferences User preferences
 * @param onSuccess Callback function to execute after successful move
 */
export async function moveEnvelopeAndRefresh(
  id: string,
  targetFolder: string,
  preferences: Preferences,
  onSuccess: () => void,
): Promise<void> {
  try {
    // Show moving toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Moving email...",
    });

    // Execute move command - wait for this to complete first
    await execa(
      preferences.binaryPath,
      ["message", "move", targetFolder, id, "--account", preferences.defaultAccount, "--output", "json"],
      {},
    );

    // Only after successful CLI move, update localStorage
    const { envelopes } = await loadEnvelopesFromStorage();
    const updatedEnvelopes = envelopes.map((envelope) => {
      if (envelope.id === id) {
        return { ...envelope, folder_name: targetFolder };
      }
      return envelope;
    });
    await updateEnvelopesInStorage(updatedEnvelopes);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Email moved",
      message: `Email was successfully moved to ${targetFolder}`,
    });

    // Call the success callback
    onSuccess();
  } catch (error) {
    console.error("Move error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to move email",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
