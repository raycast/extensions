import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { Flashcard, FlashcardGenerator } from "../ai/flashcardGenerator";
import { AnkiRepository } from "../anki/ankiRepository";
import { ErrorHandler } from "../utils/errorHandler";
import { Logger } from "../utils/logger";

export function useFlashcardGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<string[]>([]);

  const loadDecks = async () => {
    try {
      const response = await AnkiRepository.getDecks();
      if (response.error || !response.result) {
        ErrorHandler.handleAnkiConnectionError();
        return [];
      }
      const ankiDecks = response.result as string[];
      setDecks(ankiDecks);
      return ankiDecks;
    } catch (error) {
      ErrorHandler.handleAnkiConnectionError();
      return [];
    }
  };

  const generateFlashcards = async (text: string, language?: string, model?: string) => {
    setIsLoading(true);
    try {
      console.log(
        `Generating flashcards with text: ${text.substring(0, 50)}..., language: ${language}, model: ${model}`,
      );

      const options = {
        language: language || "português",
        model: model,
      };

      const generatedCards = await FlashcardGenerator.generate(text, options);
      console.log(`Generated ${generatedCards.length} flashcards`);

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

      // Se o modelo selecionado é "Raycast Flashcards", verifica se ele existe e cria se necessário
      if (modelName === "Raycast Flashcards") {
        const createModelResponse = await AnkiRepository.createRaycastFlashcardsModelIfNeeded();
        if (createModelResponse.error) {
          ErrorHandler.handle(new Error(createModelResponse.error), "Erro ao criar modelo Raycast Flashcards");
          return false;
        }

        // Verificar novamente se o modelo existe após a tentativa de criação
        const modelsResponse = await AnkiRepository.modelNames();
        if (modelsResponse.error) {
          ErrorHandler.handle(new Error(modelsResponse.error), "Erro ao verificar modelos");
          return false;
        }

        const models = modelsResponse.result as string[];
        if (!models.includes("Raycast Flashcards")) {
          ErrorHandler.handle(
            new Error("Modelo não encontrado após tentativa de criação"),
            "Erro ao criar modelo Raycast Flashcards",
          );
          return false;
        }

        Logger.debug("Modelo Raycast Flashcards verificado/criado com sucesso");
      }

      // Adicionar flashcards ao Anki
      const result = await AnkiRepository.addFlashcards(selectedCards, deckName, modelName, tags);

      if (result.error) {
        ErrorHandler.handle(new Error(result.error), "Erro ao adicionar flashcards ao Anki");
        return false;
      }

      showToast({
        style: Toast.Style.Success,
        title: "Flashcards adicionados ao Anki",
        message: `${selectedCards.length} flashcards adicionados ao deck "${deckName}"`,
      });

      return true;
    } catch (error) {
      ErrorHandler.handle(error, "Erro ao adicionar flashcards ao Anki");
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
  };

  const testAnkiConnection = async () => {
    try {
      // Create Raycast Flashcards model if needed during connection test
      await AnkiRepository.createRaycastFlashcardsModelIfNeeded();

      const result = await AnkiRepository.testConnection();
      return result.success;
    } catch (error) {
      return false;
    }
  };

  return {
    isLoading,
    setIsLoading,
    flashcards,
    decks,
    loadDecks,
    generateFlashcards,
    addFlashcardsToAnki,
    editFlashcard,
    deleteFlashcard,
    testAnkiConnection,
  };
}
