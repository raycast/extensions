import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto"; // Use crypto for generating unique IDs
import { SavedCommand } from "../types/types";

const SAVED_COMMANDS_KEY = "n8nSavedWebhookCommands";

/**
 * Retrieves the list of saved commands from LocalStorage.
 * @returns A promise that resolves to an array of SavedCommand objects.
 */
export async function getSavedCommands(): Promise<SavedCommand[]> {
  try {
    const rawData = await LocalStorage.getItem<string>(SAVED_COMMANDS_KEY);
    if (!rawData) {
      return []; // No commands saved yet
    }
    // TODO: Add validation here? Maybe use a schema validator like Zod?
    const commands = JSON.parse(rawData) as SavedCommand[];
    return Array.isArray(commands) ? commands : []; // Ensure it's an array
  } catch (error) {
    console.error("Failed to retrieve saved commands:", error);
    // Decide if we should clear corrupted data or just return empty
    // await LocalStorage.removeItem(SAVED_COMMANDS_KEY); // Option: Clear corrupted data
    return []; // Return empty on error
  }
}

/**
 * Adds a new saved command to LocalStorage.
 * @param commandData The command data to save (without the ID).
 * @returns A promise that resolves when the command is saved.
 */
export async function addSavedCommand(commandData: Omit<SavedCommand, 'id'>): Promise<void> {
  try {
    const existingCommands = await getSavedCommands();
    const newCommand: SavedCommand = {
      ...commandData,
      id: randomUUID(), // Generate a unique ID
    };
    const updatedCommands = [...existingCommands, newCommand];
    await LocalStorage.setItem(SAVED_COMMANDS_KEY, JSON.stringify(updatedCommands));
  } catch (error) {
    console.error("Failed to add saved command:", error);
    throw new Error("Could not save command."); // Re-throw for UI feedback
  }
}

/**
 * Deletes a saved command from LocalStorage by its ID.
 * @param id The ID of the command to delete.
 * @returns A promise that resolves when the command is deleted.
 */
export async function deleteSavedCommand(id: string): Promise<void> {
  try {
    const existingCommands = await getSavedCommands();
    const updatedCommands = existingCommands.filter(cmd => cmd.id !== id);
    await LocalStorage.setItem(SAVED_COMMANDS_KEY, JSON.stringify(updatedCommands));
  } catch (error) {
    console.error("Failed to delete saved command:", error);
    throw new Error("Could not delete command."); // Re-throw for UI feedback
  }
}