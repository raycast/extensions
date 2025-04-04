import { execa } from "execa";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { z } from "zod";
import { Envelope } from "./models";
import { Preferences } from "./preferences";

/**
 * Fetches envelopes from the Himalaya CLI and updates LocalStorage
 * @param preferences User preferences containing binary path and account
 * @returns Array of envelopes
 */
export async function fetchEnvelopesFromCLI(preferences: Preferences): Promise<Envelope[]> {
  const pageSize = 100;

  try {
    // Execute the CLI command to list envelopes
    const result = await execa(
      preferences.binaryPath,
      ["envelope", "list", "--account", preferences.defaultAccount, "--output", "json", "--page-size", `${pageSize}`],
      {},
    );

    // Parse the JSON response
    const parsedData = JSON.parse(result.stdout);
    const envelopes = z.array(Envelope).parse(parsedData);

    // Update LocalStorage
    await updateEnvelopesInStorage(envelopes);

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
 * Deletes an envelope using the Himalaya CLI and refreshes the envelope list
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

    // Execute delete command
    await execa(
      preferences.binaryPath,
      ["message", "delete", id, "--account", preferences.defaultAccount, "--output", "json"],
      {},
    );

    // Fetch the latest envelopes from the CLI
    await fetchEnvelopesFromCLI(preferences);

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
