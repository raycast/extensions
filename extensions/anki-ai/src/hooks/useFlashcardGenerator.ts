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
      const response = await AnkiRepository.getDecks();
      if (response.error || !response.result) {
        ErrorHandler.handleAnkiConnectionError();
        setIsLoading(false);
        return [];
      }
      const ankiDecks = response.result as string[];
      setDecks(ankiDecks);
      setIsLoading(false);
      return ankiDecks;
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

      if (modelName === "Raycast Flashcards") {
        const createModelResponse = await AnkiRepository.createRaycastFlashcardsModelIfNeeded();
        if (createModelResponse.error) {
          ErrorHandler.handle(new Error(createModelResponse.error), "Error creating Raycast Flashcards model");
          return false;
        }

        const modelsResponse = await AnkiRepository.modelNames();
        if (modelsResponse.error) {
          ErrorHandler.handle(new Error(modelsResponse.error), "Error checking models");
          return false;
        }

        const models = modelsResponse.result as string[];
        if (!models.includes("Raycast Flashcards")) {
          ErrorHandler.handle(
            new Error("Model not found after creation attempt"),
            "Error creating Raycast Flashcards model",
          );
          return false;
        }

        Logger.debug("Raycast Flashcards model verified/created successfully");
      }

      const result = await AnkiRepository.addFlashcards(selectedCards, deckName, modelName, tags);

      if (result.error) {
        ErrorHandler.handle(new Error(result.error), "Error adding flashcards to Anki");
        return false;
      }

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
      ErrorHandler.handle(error, "Error adding flashcards to Anki");
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
        title: "Testing connection to Anki",
        message: "Please wait...",
      });

      // First try to create the Raycast Flashcards model if needed
      try {
        await AnkiRepository.createRaycastFlashcardsModelIfNeeded();
      } catch (error) {
        // Ignore errors here, we'll check the connection directly
        Logger.warn("Error creating Raycast Flashcards model during connection test:", error);
      }

      // Test the connection
      const result = await AnkiRepository.testConnection();

      if (result.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Anki connection successful",
          message: "Connected to Anki successfully",
        });

        // Reload decks after successful connection
        await loadDecks();

        return true;
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Anki connection failed",
          message: result.message || "Could not connect to Anki",
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Anki connection error",
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
