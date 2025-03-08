import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { Flashcard, FlashcardGenerator } from "../ai/flashcardGenerator";
import { AnkiRepository } from "../anki/ankiRepository";
import { ErrorHandler } from "../utils/errorHandler";
import { Logger } from "../utils/logger";
import { ParameterStorage, FlashcardGenerationParameters, FlashcardExportParameters } from "../utils/parameterStorage";

export function useFlashcardGenerator() {
  const [isLoading, setIsLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<string[]>([]);
  const [lastParameters, setLastParameters] = useState<FlashcardGenerationParameters | null>(null);

  const loadLastParameters = async () => {
    try {
      const params = await ParameterStorage.getLastParameters();
      setLastParameters(params);
      return params;
    } catch (error) {
      Logger.error("Error loading last parameters:", error);
      return null;
    }
  };

  const loadDecks = async () => {
    try {
      setIsLoading(true);
      const ankiDecks = await AnkiRepository.getDecks();

      // If we got a valid array of decks, update the state
      if (ankiDecks && ankiDecks.length > 0) {
        setDecks(ankiDecks);
        setIsLoading(false);
        return ankiDecks;
      } else {
        // If no decks were returned, create a default deck
        const defaultDeck = "Default";
        await AnkiRepository.createDeck(defaultDeck);
        setDecks([defaultDeck]);
        setIsLoading(false);
        return [defaultDeck];
      }
    } catch (error) {
      ErrorHandler.handleAnkiConnectionError();
      setIsLoading(false);
      return [];
    }
  };

  const generateFlashcards = async (
    text: string,
    language?: string,
    model?: string,
    additionalOptions?: {
      difficultyLevel?: "beginner" | "intermediate" | "advanced";
      numCards?: number;
      enableTags?: boolean;
      customPrompt?: string;
    },
  ) => {
    setIsLoading(true);
    try {
      Logger.debug(
        `Generating flashcards with text: ${text.substring(0, 50)}..., language: ${language}, model: ${model}, difficulty: ${additionalOptions?.difficultyLevel}, numCards: ${additionalOptions?.numCards}`,
      );

      const options = {
        language: language || "english",
        model: model,
        difficultyLevel: additionalOptions?.difficultyLevel || "intermediate",
        numCards: additionalOptions?.numCards || 5,
        enableTags: additionalOptions?.enableTags !== undefined ? additionalOptions.enableTags : true,
        customPrompt: additionalOptions?.customPrompt || "",
      };

      const generationParams: FlashcardGenerationParameters = {
        language: options.language,
        model: options.model,
        textLength: text.length,
        timestamp: Date.now(),
        difficultyLevel: options.difficultyLevel,
        numCards: options.numCards,
        enableTags: options.enableTags,
      };

      const generatedCards = await FlashcardGenerator.generate(text, options);
      Logger.debug(`Generated ${generatedCards.length} flashcards`);

      generationParams.generatedCount = generatedCards.length;
      await ParameterStorage.saveParameters(generationParams);

      setLastParameters(generationParams);
      setFlashcards(generatedCards);

      return generatedCards;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      ErrorHandler.handleAIError(error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const addFlashcardsToAnki = async (
    selectedCards: Flashcard[],
    deckName: string,
    modelName: string,
    tags: string[] = [],
  ) => {
    try {
      setIsLoading(true);

      // First, check the connection with Anki
      const connectionStatus = await AnkiRepository.getConnectionStatus();

      if (!connectionStatus.ankiRunning || !connectionStatus.ankiConnectAvailable) {
        showToast({
          style: Toast.Style.Failure,
          title: "Anki connection error",
          message: connectionStatus.message || "Check if Anki is open and AnkiConnect is installed",
        });
        return false;
      }

      // Prepare flashcards for export
      Logger.debug(`Exporting ${selectedCards.length} flashcards to deck "${deckName}" using model "${modelName}"`);

      // Convert flashcards from Raycast format to the format accepted by AnkiRepository
      const ankiFlashcards = selectedCards.map((card) => ({
        front: card.front,
        back: card.back,
        extra: card.extra,
        tags: card.tags || [],
        mediaFiles: card.mediaFiles,
        difficulty: card.difficulty,
      }));

      // Add flashcards using the improved method
      const result = await AnkiRepository.addFlashcards(ankiFlashcards, deckName, modelName, {
        tags: tags,
        allowDuplicates: false,
      });

      if (!result.success) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error adding flashcards",
          message: result.message,
        });
        Logger.error("Error details:", result.details);
        return false;
      }

      // Save export parameters for future use
      const exportParams: FlashcardExportParameters = {
        deckName,
        modelName,
        tags,
        count: selectedCards.length,
        timestamp: Date.now(),
      };

      await ParameterStorage.saveExportParameters(exportParams);
      await loadLastParameters();

      showToast({
        style: Toast.Style.Success,
        title: "Flashcards added to Anki",
        message: `${selectedCards.length} flashcards added to deck "${deckName}"`,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Logger.error("Error adding flashcards to Anki:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Error adding flashcards",
        message: errorMessage,
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const editFlashcard = (index: number, updatedCard: Flashcard) => {
    const newFlashcards = [...flashcards];
    newFlashcards[index] = updatedCard;
    setFlashcards(newFlashcards);
  };

  const deleteFlashcard = (index: number) => {
    const newFlashcards = flashcards.filter((_, i) => i !== index);
    setFlashcards(newFlashcards);

    if (lastParameters) {
      const updatedParams = {
        ...lastParameters,
        generatedCount: newFlashcards.length,
      };
      ParameterStorage.saveParameters(updatedParams);
      setLastParameters(updatedParams);
    }
  };

  const testAnkiConnection = async () => {
    try {
      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Testing connection with Anki",
        message: "Please wait...",
      });

      // Use the new connection diagnostic method
      const connectionStatus = await AnkiRepository.getConnectionStatus();

      if (connectionStatus.ankiRunning && connectionStatus.ankiConnectAvailable) {
        showToast({
          style: Toast.Style.Success,
          title: "Connection with Anki established",
          message: connectionStatus.message,
        });

        // Reload decks after successful connection
        await loadDecks();

        return true;
      } else {
        // If Anki is not running, try to instruct the user
        const errorMessage = connectionStatus.message;
        showToast({
          style: Toast.Style.Failure,
          title: "Anki connection error",
          message: errorMessage,
        });

        // If AnkiConnect is installed but not accessible, try to recover
        if (connectionStatus.ankiRunning && !connectionStatus.ankiConnectAvailable) {
          try {
            // Try to recover the connection
            const recoveryResult = await AnkiRepository.attemptConnectionRecovery();
            if (recoveryResult.success) {
              showToast({
                style: Toast.Style.Success,
                title: "Connection recovered",
                message: recoveryResult.message,
              });
              await loadDecks();
              return true;
            }
          } catch (error) {
            // Ignore errors during recovery attempt
          }
        }

        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Logger.error("Error testing connection with Anki:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error testing connection with Anki",
        message: errorMessage,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLastParameters();
  }, []);

  return {
    isLoading,
    setIsLoading,
    flashcards,
    decks,
    lastParameters,
    loadDecks,
    loadLastParameters,
    generateFlashcards,
    addFlashcardsToAnki,
    editFlashcard,
    deleteFlashcard,
    testAnkiConnection,
  };
}
