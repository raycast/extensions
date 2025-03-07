import { AnkiRepository } from "./ankiRepository";
import { AnkiNote } from "./ankiTypes";
import { Logger } from "../utils/logger";

export class AnkiService {
  /**
   * Adds a new note to Anki
   * @param note Note object to be added
   * @returns ID of the added note or error message
   */
  static async addNote(note: AnkiNote): Promise<{ result?: number; error?: string }> {
    try {
      Logger.debug("AnkiService.addNote called with note", note);

      // Check if Anki is running
      const isRunning = await AnkiRepository.isAnkiRunning();
      if (!isRunning) {
        return {
          error:
            "Anki is not running or AnkiConnect is not installed. Please open Anki and verify that AnkiConnect is installed. To install AnkiConnect, open Anki, go to Tools > Add-ons > Get Add-ons and enter the code 2055492159.",
        };
      }

      // Validate the note before sending
      if (!note.deckName || !note.modelName || !note.fields) {
        return { error: "Required fields missing: deckName, modelName or fields" };
      }

      // Ensure that at least one field has content
      const hasContent = Object.values(note.fields).some(
        (value) => value !== undefined && value !== null && value !== "",
      );

      if (!hasContent) {
        return { error: "At least one field must have content" };
      }

      // For Cloze model, ensure that Text exists
      if (note.modelName === "Cloze") {
        if (!note.fields.Text) {
          // Try to use Front or Frente as Text if available
          if (note.fields.Frente) {
            note.fields.Text = note.fields.Frente;
            delete note.fields.Frente;
          } else if (note.fields.Front) {
            note.fields.Text = note.fields.Front;
            delete note.fields.Front;
          } else {
            return { error: "For the Cloze model, the Text field is required" };
          }
        }

        // Check if the text already contains cloze markers
        const hasClozeMarkers = /\{\{c\d+::.+?\}\}/i.test(note.fields.Text);

        if (!hasClozeMarkers) {
          // If it doesn't have cloze markers, try to create a basic one
          note.fields.Text = `{{c1::${note.fields.Text}}}`;
        }
      }

      // Send to AnkiRepository - with retry for connection errors
      let response: { result?: number; error?: string } | undefined;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        response = await AnkiRepository.addNote(note);

        // If there was no error or the error is not connection-related, exit the loop
        if (
          !response?.error ||
          (!response.error.includes("ECONNRESET") &&
            !response.error.includes("Communication failure") &&
            !response.error.includes("Timeout"))
        ) {
          break;
        }

        // If we have more attempts, wait and try again
        if (retryCount < maxRetries) {
          Logger.debug(`Connection error when adding note, trying again (${retryCount + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
          retryCount++;
        } else {
          break;
        }
      }

      // If we didn't receive a response from AnkiRepository
      if (!response) {
        return {
          error: "No response received from AnkiConnect after multiple attempts.",
        };
      }

      if (response.error) {
        Logger.error("Error adding note:", response.error);

        // Make the error more user-friendly if it's a connection error
        if (
          response.error.includes("ECONNRESET") ||
          response.error.includes("Communication failure") ||
          response.error.includes("Timeout")
        ) {
          return {
            error: "Could not connect to Anki. Verify that Anki is open and AnkiConnect is installed.",
          };
        }

        // Handle specific AnkiConnect errors
        if (response.error.includes("collection is not available")) {
          return {
            error:
              "Anki is open, but the collection is not available. Check if there's any dialog open in Anki or if the collection is being synchronized.",
          };
        }

        if (response.error.includes("deck was not found")) {
          return {
            error: "The specified deck was not found. Check the deck name or create it first.",
          };
        }

        if (response.error.includes("model was not found")) {
          return {
            error: "The specified note model was not found. Check the model name.",
          };
        }

        if (response.error.includes("cannot create note")) {
          return {
            error: "Could not create the note. Check that all required fields are filled in correctly.",
          };
        }

        return { error: response.error };
      }

      if (response.result === null || response.result === undefined) {
        Logger.error("AnkiConnect response does not contain note ID");
        return { error: "AnkiConnect response does not contain note ID" };
      }

      Logger.debug("Note added successfully, ID:", response.result);
      return { result: response.result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error adding note:", errorMessage);

      // Improve message for common errors
      if (
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("network error")
      ) {
        return {
          error: "Connection error with Anki. Verify that Anki is open and AnkiConnect is installed.",
        };
      }

      return { error: `Error adding note: ${errorMessage}` };
    }
  }

  /**
   * Adds multiple notes to Anki
   * @param notes Array of note objects to be added
   * @returns Object with array of added note IDs or error message
   */
  static async addNotes(notes: AnkiNote[]): Promise<{ result: number[] | null; error: string | undefined }> {
    try {
      // Check if Anki is running
      const isRunning = await AnkiRepository.isAnkiRunning();
      if (!isRunning) {
        Logger.error("Anki is not running");
        return {
          result: null,
          error:
            "Anki is not running or AnkiConnect is not installed. Please open Anki and verify that AnkiConnect is installed. To install AnkiConnect, open Anki, go to Tools > Add-ons > Get Add-ons and enter the code 2055492159.",
        };
      }

      // Check if there are notes to add
      if (!notes || notes.length === 0) {
        Logger.error("No notes to add");
        return { result: null, error: "No notes to add" };
      }

      // Add the notes
      const response = await AnkiRepository.addNotes(notes);

      if (response.error) {
        Logger.error(`Error adding notes: ${response.error}`);
        return { result: null, error: response.error };
      }

      return { result: response.result, error: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Error adding notes: ${errorMessage}`);
      return { result: null, error: errorMessage };
    }
  }

  /**
   * Gets the list of available decks in Anki
   * @returns Array of deck names
   */
  static async getDecks(): Promise<string[]> {
    try {
      const response = await AnkiRepository.getDecks();

      if (response.error) {
        Logger.error(`Error getting decks: ${response.error}`);
        return [];
      }

      if (!Array.isArray(response.result)) {
        Logger.error("Invalid response when getting decks (not an array)");
        return [];
      }

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Error getting decks: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Creates a new deck in Anki
   * @param deckName Name of the deck to be created
   * @returns true if the deck was created successfully
   */
  static async createDeck(deckName: string): Promise<boolean> {
    try {
      if (!deckName || deckName.trim() === "") {
        Logger.error("Invalid deck name");
        return false;
      }

      const response = await AnkiRepository.createDeck(deckName);

      if (response.error) {
        Logger.error(`Error creating deck: ${response.error}`);
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Error creating deck: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Gets the list of available models in Anki
   * @returns Array of model names
   */
  static async getModelNames(): Promise<string[]> {
    try {
      const response = await AnkiRepository.modelNames();

      if (response.error) {
        Logger.error(`Error getting models: ${response.error}`);
        return [];
      }

      if (!Array.isArray(response.result)) {
        Logger.error("Invalid response when getting models (not an array)");
        return [];
      }

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Error getting models: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Gets the field names for a specific model
   * @param modelName Name of the model
   * @returns Array of field names
   */
  static async getModelFieldNames(modelName: string): Promise<string[]> {
    try {
      if (!modelName || modelName.trim() === "") {
        Logger.error("Invalid model name");
        return [];
      }

      const response = await AnkiRepository.modelFieldNames(modelName);

      if (response.error) {
        Logger.error(`Error getting model fields: ${response.error}`);
        return [];
      }

      if (!Array.isArray(response.result)) {
        Logger.error("Invalid response when getting model fields (not an array)");
        return [];
      }

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Error getting model fields: ${errorMessage}`);
      return [];
    }
  }
}
