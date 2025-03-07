import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { FlashcardGenerator } from "../ai/flashcardGenerator";
import { AnkiRepository } from "../anki/ankiRepository";
import { ErrorHandler } from "../utils/errorHandler";
import { Logger } from "../utils/logger";
import { NetworkHelper } from "../utils/networkHelper";

interface Preferences {
  defaultLanguage: string;
  defaultModel: string;
  defaultDeck: string;
  ankiConnectPort: string;
  minFlashcards: string;
  maxFlashcards: string;
  enableTags: boolean;
  customPromptTemplate: string;
  debugMode: boolean;
}

export default async function (props: { arguments: { text: string } }) {
  try {
    // Use text from command arguments instead of selected text
    const text = props.arguments.text?.trim();

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Text not provided",
        message: "Please provide text to generate flashcards",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Generating flashcards...",
      message: "This may take a few seconds",
    });

    // Get user preferences
    const preferences = getPreferenceValues<Preferences>();
    const language = preferences.defaultLanguage || "English";
    const model = preferences.defaultModel || undefined;
    const minFlashcards = parseInt(preferences.minFlashcards || "5", 10);
    const maxFlashcards = parseInt(preferences.maxFlashcards || "20", 10);
    const enableTags = preferences.enableTags;
    const debugMode = preferences.debugMode;
    const customPrompt = preferences.customPromptTemplate;

    // Enable debug mode if configured
    if (debugMode) {
      Logger.setDebugMode(true);
      Logger.debug("Debug mode activated");
      Logger.debug(
        `Preferences: Language=${language}, Model=${model}, Min=${minFlashcards}, Max=${maxFlashcards}, Tags=${enableTags}`,
      );
    }

    Logger.debug(`Generating flashcards with text: ${text.substring(0, 50)}...`);

    try {
      // Generate flashcards with all options
      const flashcards = await FlashcardGenerator.generate(text, {
        language,
        model,
        minFlashcards,
        maxFlashcards,
        enableTags,
        customPrompt,
      });

      if (!flashcards || flashcards.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to generate flashcards",
          message: "No flashcards were generated. Try with different text.",
        });
        return;
      }

      Logger.debug(`${flashcards.length} flashcards generated successfully`);

      // Create Raycast Flashcards model if needed with retry logic.
      // Modified logic: if error "Front" is returned, assume model already exists.
      let attempt = 0;
      let modelResponse;
      while (attempt < 5) {
        modelResponse = await AnkiRepository.createRaycastFlashcardsModelIfNeeded();
        if (modelResponse.success) break;
        if (modelResponse.error === "Front") {
          Logger.warn(`Attempt ${attempt + 1}/5: Received "Front" error. Treating as model already exists.`);
          await showToast({
            style: Toast.Style.Success,
            title: "Model exists",
            message: "Raycast Flashcards model already exists. Continuing...",
          });
          modelResponse.success = true;
          break;
        } else {
          Logger.error(`Attempt ${attempt + 1}/5: Error creating model: ${modelResponse.error}`);
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
      if (!modelResponse || !modelResponse.success) {
        const formattedError = NetworkHelper.formatErrorMessage(new Error(modelResponse?.error || "Unknown error"));
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create model in Anki",
          message: formattedError,
        });
        return;
      }

      Logger.debug("Raycast Flashcards model verified/created successfully");

      // Get available decks
      const decksResponse = await AnkiRepository.getDecks();
      if (!decksResponse || decksResponse.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to retrieve Anki decks",
          message: "Ensure Anki is open and AnkiConnect is installed",
        });
        return;
      }

      const decks = decksResponse as string[];

      // Use default deck from preferences if available, otherwise use the first available deck
      let defaultDeck = preferences.defaultDeck;
      if (!defaultDeck || !decks.includes(defaultDeck)) {
        defaultDeck = decks.length > 0 ? decks[0] : "Default";
        if (preferences.defaultDeck && !decks.includes(preferences.defaultDeck)) {
          Logger.warn(`Default deck "${preferences.defaultDeck}" not found, using "${defaultDeck}"`);
        }
      }

      // Add flashcards to Anki using Raycast Flashcards model
      const addResponse = await AnkiRepository.addFlashcards(flashcards, defaultDeck, "Raycast Flashcards");

      if (!addResponse.success) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add flashcards to Anki",
          message: addResponse.message,
        });
        return;
      }

      const addedCount = Array.isArray(addResponse.details)
        ? (addResponse.details as unknown[]).filter((id: unknown) => id !== null).length
        : 0;

      await showToast({
        style: Toast.Style.Success,
        title: `${addedCount} flashcard(s) added successfully`,
        message: `Added to deck "${defaultDeck}"`,
      });
    } catch (error) {
      Logger.error("Error generating flashcards:", error);
      throw error;
    }
  } catch (error) {
    Logger.error("Error generating or adding flashcards:", error);
    ErrorHandler.handle(error, "Error processing flashcards");
  }
}
