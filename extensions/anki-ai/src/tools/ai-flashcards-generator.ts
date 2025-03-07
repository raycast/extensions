import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { FlashcardGenerator } from "../ai/flashcardGenerator";
import { AnkiRepository } from "../anki/ankiRepository";
import { ErrorHandler } from "../utils/errorHandler";
import { Logger } from "../utils/logger";

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
        title: "Texto não fornecido",
        message: "Por favor, forneça um texto para gerar flashcards",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Gerando flashcards...",
      message: "Isso pode levar alguns segundos",
    });

    // Get user preferences
    const preferences = getPreferenceValues<Preferences>();
    const language = preferences.defaultLanguage || "português";
    const model = preferences.defaultModel || undefined;
    const minFlashcards = parseInt(preferences.minFlashcards || "5", 10);
    const maxFlashcards = parseInt(preferences.maxFlashcards || "20", 10);
    const enableTags = preferences.enableTags;
    const debugMode = preferences.debugMode;
    const customPrompt = preferences.customPromptTemplate;

    // Enable debug mode if configured
    if (debugMode) {
      Logger.setDebugMode(true);
      Logger.debug("Modo de depuração ativado");
      Logger.debug(
        `Preferências: Idioma=${language}, Modelo=${model}, Min=${minFlashcards}, Max=${maxFlashcards}, Tags=${enableTags}`,
      );
    }

    Logger.debug(`Gerando flashcards com texto: ${text.substring(0, 50)}...`);

    // Generate flashcards with all options
    const flashcards = await FlashcardGenerator.generate(text, {
      language,
      model,
      minFlashcards,
      maxFlashcards,
      enableTags,
      customPrompt,
      debugMode,
    });

    if (!flashcards || flashcards.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Falha ao gerar flashcards",
        message: "Nenhum flashcard foi gerado. Tente com outro texto.",
      });
      return;
    }

    Logger.debug(`${flashcards.length} flashcards gerados com sucesso`);

    // Create Raycast Flashcards model if needed
    const modelResponse = await AnkiRepository.createRaycastFlashcardsModelIfNeeded();
    if (modelResponse.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Falha ao criar modelo no Anki",
        message: "Não foi possível criar o modelo Raycast Flashcards",
      });
      Logger.error(`Erro ao criar modelo: ${modelResponse.error}`);
      return;
    }

    Logger.debug("Modelo Raycast Flashcards verificado/criado com sucesso");

    // Get available decks
    const decksResponse = await AnkiRepository.getDecks();
    if (decksResponse.error || !decksResponse.result) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Falha ao obter decks do Anki",
        message: "Verifique se o Anki está aberto e o AnkiConnect instalado",
      });
      return;
    }

    const decks = decksResponse.result as string[];

    // Use default deck from preferences if available, otherwise use first available deck
    let defaultDeck = preferences.defaultDeck;
    if (!defaultDeck || !decks.includes(defaultDeck)) {
      defaultDeck = decks.length > 0 ? decks[0] : "Default";
      if (preferences.defaultDeck && !decks.includes(preferences.defaultDeck)) {
        Logger.warn(`Deck padrão "${preferences.defaultDeck}" não encontrado, usando "${defaultDeck}"`);
      }
    }

    // Add flashcards to Anki using Raycast Flashcards model
    const result = await AnkiRepository.addFlashcards(flashcards, defaultDeck, "Raycast Flashcards");

    if (result.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Falha ao adicionar flashcards ao Anki",
        message: result.error,
      });
      return;
    }

    const addedCount = Array.isArray(result.result) ? result.result.filter((id) => id !== null).length : 0;

    await showToast({
      style: Toast.Style.Success,
      title: `${addedCount} flashcard(s) adicionado(s) com sucesso`,
      message: `Adicionados ao deck "${defaultDeck}"`,
    });
  } catch (error) {
    Logger.error("Erro ao gerar ou adicionar flashcards:", error);
    ErrorHandler.handle(error, "Erro ao processar flashcards");
  }
}
