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

      // Primeiro, verificar a conexão com o Anki
      const connectionStatus = await AnkiRepository.getConnectionStatus();

      if (!connectionStatus.ankiRunning || !connectionStatus.ankiConnectAvailable) {
        showToast({
          style: Toast.Style.Failure,
          title: "Erro de conexão com o Anki",
          message: connectionStatus.message || "Verifique se o Anki está aberto e o AnkiConnect está instalado",
        });
        return false;
      }

      // Preparar flashcards para exportação
      Logger.debug(
        `Exportando ${selectedCards.length} flashcards para o deck "${deckName}" usando modelo "${modelName}"`,
      );

      // Converter flashcards do formato do Raycast para o formato aceito pelo AnkiRepository
      const ankiFlashcards = selectedCards.map((card) => ({
        front: card.front,
        back: card.back,
        extra: card.extra,
        tags: card.tags || [],
        mediaFiles: card.mediaFiles,
        difficulty: card.difficulty,
      }));

      // Adicionar flashcards usando o método melhorado
      const result = await AnkiRepository.addFlashcards(ankiFlashcards, deckName, modelName, {
        tags: tags,
        allowDuplicates: false,
      });

      if (!result.success) {
        showToast({
          style: Toast.Style.Failure,
          title: "Erro ao adicionar flashcards",
          message: result.message,
        });
        Logger.error("Detalhes do erro:", result.details);
        return false;
      }

      // Salvar os parâmetros de exportação para uso futuro
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
        title: "Flashcards adicionados ao Anki",
        message: `${selectedCards.length} flashcards adicionados ao deck "${deckName}"`,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      Logger.error("Erro ao adicionar flashcards ao Anki:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao adicionar flashcards",
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
        title: "Testando conexão com o Anki",
        message: "Por favor, aguarde...",
      });

      // Utilizar o novo método de diagnóstico de conexão
      const connectionStatus = await AnkiRepository.getConnectionStatus();

      if (connectionStatus.ankiRunning && connectionStatus.ankiConnectAvailable) {
        showToast({
          style: Toast.Style.Success,
          title: "Conexão com o Anki estabelecida",
          message: connectionStatus.message,
        });

        // Recarregar decks após conexão bem-sucedida
        await loadDecks();

        return true;
      } else {
        // Se o Anki não está rodando, tente instruir o usuário
        const errorMessage = connectionStatus.message;
        showToast({
          style: Toast.Style.Failure,
          title: "Erro de conexão com o Anki",
          message: errorMessage,
        });

        // Se AnkiConnect está instalado mas não acessível, tente recuperar
        if (connectionStatus.ankiRunning && !connectionStatus.ankiConnectAvailable) {
          try {
            // Tentar recuperar a conexão
            const recoveryResult = await AnkiRepository.attemptConnectionRecovery();
            if (recoveryResult.success) {
              showToast({
                style: Toast.Style.Success,
                title: "Conexão recuperada",
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
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      Logger.error("Erro ao testar conexão com o Anki:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao testar conexão com o Anki",
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
