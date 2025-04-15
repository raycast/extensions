import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto"; // Use crypto for generating unique IDs
import { SavedCommand } from "../types/types";

const SAVED_COMMANDS_KEY = "n8nSavedWebhookCommands";

/**
 * Validates a SavedCommand object to ensure it has all required properties.
 * @param command The command object to validate.
 * @returns True if the command is valid, false otherwise.
 */
function isValidSavedCommand(command: unknown): command is SavedCommand {
  if (!command || typeof command !== "object") {
    return false;
  }

  // Now we can safely cast to Record<string, unknown>
  const cmd = command as Record<string, unknown>;

  return (
    typeof cmd.id === "string" &&
    typeof cmd.name === "string" &&
    typeof cmd.method === "string" &&
    typeof cmd.url === "string" &&
    (cmd.headers === undefined || typeof cmd.headers === "string") &&
    (cmd.queryParams === undefined || typeof cmd.queryParams === "string") &&
    (cmd.body === undefined || typeof cmd.body === "string")
  );
}

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

    // Parse the data and validate
    let commands: unknown[];
    try {
      const parsed = JSON.parse(rawData);
      commands = Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error("Failed to parse saved commands:", parseError);
      return []; // Return empty on parse error
    }

    // Filter out invalid commands
    const validCommands = commands.filter(isValidSavedCommand);

    // If we found invalid commands, save only the valid ones back to storage
    if (validCommands.length !== commands.length) {
      console.warn(`Found ${commands.length - validCommands.length} invalid saved commands. Cleaning up.`);
      await LocalStorage.setItem(SAVED_COMMANDS_KEY, JSON.stringify(validCommands));
    }

    return validCommands;
  } catch (error) {
    console.error("Failed to retrieve saved commands:", error);
    return []; // Return empty on error
  }
}

/**
 * Adds a new saved command to LocalStorage.
 * @param commandData The command data to save (without the ID).
 * @returns A promise that resolves when the command is saved.
 */
export async function addSavedCommand(commandData: Omit<SavedCommand, "id">): Promise<void> {
  try {
    // Ensure all required fields are present and valid
    if (!commandData.name || typeof commandData.name !== "string") {
      throw new Error("Command name is required");
    }
    if (!commandData.method || typeof commandData.method !== "string") {
      throw new Error("Command method is required");
    }
    if (!commandData.url || typeof commandData.url !== "string") {
      throw new Error("Command URL is required");
    }

    // Ensure optional fields are strings or undefined
    const sanitizedCommand = {
      ...commandData,
      headers: commandData.headers || "",
      queryParams: commandData.queryParams || "",
      body: commandData.body || "",
    };

    const existingCommands = await getSavedCommands();
    const newCommand: SavedCommand = {
      ...sanitizedCommand,
      id: randomUUID(), // Generate a unique ID
    };
    const updatedCommands = [...existingCommands, newCommand];
    await LocalStorage.setItem(SAVED_COMMANDS_KEY, JSON.stringify(updatedCommands));
  } catch (error) {
    console.error("Failed to add saved command:", error);
    throw new Error(error instanceof Error ? error.message : "Could not save command."); // Re-throw for UI feedback
  }
}

/**
 * Deletes a saved command from LocalStorage by its ID.
 * @param id The ID of the command to delete.
 * @returns A promise that resolves when the command is deleted.
 */
export async function deleteSavedCommand(id: string): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      throw new Error("Valid command ID is required");
    }

    const existingCommands = await getSavedCommands();
    const updatedCommands = existingCommands.filter((cmd) => cmd.id !== id);

    // If no commands were removed, the ID might be invalid
    if (updatedCommands.length === existingCommands.length) {
      console.warn(`No command found with ID: ${id}`);
    }

    await LocalStorage.setItem(SAVED_COMMANDS_KEY, JSON.stringify(updatedCommands));
  } catch (error) {
    console.error("Failed to delete saved command:", error);
    throw new Error(error instanceof Error ? error.message : "Could not delete command."); // Re-throw for UI feedback
  }
}

/**
 * Clears all saved commands from LocalStorage.
 * @returns A promise that resolves when all commands are cleared.
 */
export async function clearAllSavedCommands(): Promise<void> {
  try {
    await LocalStorage.removeItem(SAVED_COMMANDS_KEY);
  } catch (error) {
    console.error("Failed to clear saved commands:", error);
    throw new Error("Could not clear commands."); // Re-throw for UI feedback
  }
}
