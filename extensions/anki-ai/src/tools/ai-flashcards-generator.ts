import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
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
    let model = preferences.defaultModel || undefined;
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
      try {
        // Generate flashcards first, without requiring Anki connection
        // This allows users to still generate flashcards even if Anki isn't running
        const flashcards = await FlashcardGenerator.generate(text, {
          language,
          model,
          minFlashcards,
          maxFlashcards,
          enableTags,
          customPrompt,
        });

        // Check if we got any valid flashcards
        if (!flashcards || flashcards.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No flashcards generated",
            message: "Please try different text or settings",
          });
          return;
        }

        // Update the toast with success
        await showToast({
          style: Toast.Style.Success,
          title: `Generated ${flashcards.length} flashcards`,
        });

        // Only check Anki connection when we need to save the flashcards
        let ankiConnected = false;
        let errorMessage = "";
        try {
          // Test connection to Anki
          await AnkiRepository.testConnection();
          ankiConnected = true;
        } catch (error) {
          ankiConnected = false;

          // Create a user-friendly error message based on the error type
          if (error instanceof Error) {
            if (error.message.includes("ECONNRESET") || error.message.includes("socket hang up")) {
              errorMessage =
                language.toLowerCase().includes("portuguese") || language.toLowerCase() === "pt"
                  ? "Could not connect to Anki. Make sure Anki is open with the AnkiConnect add-on installed."
                  : "Could not connect to Anki. Make sure Anki is open with the AnkiConnect add-on installed.";
            } else {
              errorMessage =
                language.toLowerCase().includes("portuguese") || language.toLowerCase() === "pt"
                  ? `Error connecting to Anki: ${error.message}`
                  : `Error connecting to Anki: ${error.message}`;
            }
          }

          // Show warning but continue
          if (errorMessage) {
            await showToast({
              style: Toast.Style.Failure,
              title:
                language.toLowerCase().includes("portuguese") || language.toLowerCase() === "pt"
                  ? "Anki not connected"
                  : "Anki not connected",
              message: errorMessage,
            });
          }
        }

        // Check if language is Portuguese and try to use a Portuguese model if available
        const isPortuguese = language.toLowerCase().includes("portuguese") || language.toLowerCase() === "pt";
        if (isPortuguese) {
          try {
            // Try to get the Anki model names
            const modelResponse = await AnkiRepository.getModelNames();
            if (modelResponse && modelResponse.length > 0) {
              // Use the first available model that contains "Portuguese" in its name
              const portugueseModel = modelResponse.find((modelName) => modelName.toLowerCase().includes("portuguese"));
              if (portugueseModel) {
                model = portugueseModel;
              }
            }
          } catch (error) {
            Logger.error("Error getting Anki model names:", error);
          }
        }

        // Only try to create model and save to Anki if connection is available
        if (ankiConnected) {
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
        }
      } catch (innerError) {
        // Handle specific errors with user-friendly messages
        let userMessage = "Error generating flashcards. Please try again.";
        if (innerError instanceof Error) {
          const errorMsg = innerError.message;
          if (errorMsg.includes("isn't in the correct format") || errorMsg.includes("couldn't be read")) {
            userMessage = "Data format error. Try with a different model or shorter text.";
          } else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
            userMessage = "Request timed out. Please try again with shorter text.";
          } else if (errorMsg.includes("anki")) {
            userMessage =
              "Anki connection error. Please check if Anki is running and AnkiConnect is properly installed.";
          }
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Flashcard Generation Failed",
          message: userMessage,
        });
        Logger.error("Error in flashcard generation inner handler:", innerError);
      }
    } catch (error) {
      Logger.error("Error generating flashcards:", error);
      // Handle different types of errors with specific user messages
      let errorTitle = "Error Generating Flashcards";
      let errorMessage = "An unexpected error occurred while generating flashcards.";

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        // Handle connection errors
        if (
          errorMsg.includes("econnreset") ||
          errorMsg.includes("socket hang up") ||
          errorMsg.includes("network") ||
          errorMsg.includes("timeout") ||
          errorMsg.includes("connect")
        ) {
          errorTitle = "Connection Error";
          errorMessage =
            "There was a problem connecting to the service. This could be due to network issues or service unavailability.";
          await showToast({
            style: Toast.Style.Failure,
            title: errorTitle,
            message: errorMessage,
            primaryAction: {
              title: "Check Network",
              onAction: () => open("https://raycast.com/ai-status"),
            },
          });
        }
        // Handle API/format errors
        else if (errorMsg.includes("format") || errorMsg.includes("parse") || errorMsg.includes("json")) {
          errorTitle = "Response Format Error";
          errorMessage =
            "The AI response couldn't be processed correctly. Try again with a different text or settings.";
          await showToast({
            style: Toast.Style.Failure,
            title: errorTitle,
            message: errorMessage,
          });
        }
        // Handle Anki errors
        else if (errorMsg.includes("anki")) {
          errorTitle = "Anki Connection Error";
          errorMessage =
            "Could not connect to Anki. Please check if Anki is running and AnkiConnect is properly installed.";
          await showToast({
            style: Toast.Style.Failure,
            title: errorTitle,
            message: errorMessage,
            primaryAction: {
              title: "Open Anki",
              onAction: () => open("anki://"),
            },
            secondaryAction: {
              title: "Install AnkiConnect",
              onAction: () => open("https://ankiweb.net/shared/info/2055492159"),
            },
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: errorTitle,
            message: errorMessage,
          });
        }

        Logger.error("Error generating flashcards:", error);
        throw error;
      }
    }
  } catch (error) {
    Logger.error("Error generating or adding flashcards:", error);
    ErrorHandler.handle(error, "Error processing flashcards");
  }
}
