import { LocalStorage } from "@raycast/api";
import { Logger } from "./logger";

export interface FlashcardGenerationParameters {
  language?: string;
  model?: string;
  minFlashcards?: number;
  maxFlashcards?: number;
  enableTags?: boolean;
  deckName?: string;
  modelName?: string;
  customTags?: string[];
  timestamp?: number;
  textLength?: number;
  generatedCount?: number;
  exportedCount?: number;
  difficultyLevel?: "iniciante" | "intermediário" | "avançado";
  numCards?: number;
}

export interface FlashcardExportParameters {
  deckName: string;
  modelName: string;
  tags: string[];
  count: number;
  timestamp: number;
}

const STORAGE_KEY = "last_flashcard_parameters";
const EXPORT_STORAGE_KEY = "last_export_parameters";
const HISTORY_STORAGE_KEY = "flashcard_generation_history";
const MAX_HISTORY_ITEMS = 10;

export class ParameterStorage {
  /**
   * Salva os parâmetros de geração de flashcards para uso futuro
   */
  static async saveParameters(parameters: FlashcardGenerationParameters): Promise<void> {
    try {
      // Adicionar timestamp para referência
      const paramsWithTimestamp = {
        ...parameters,
        timestamp: Date.now(),
      };

      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(paramsWithTimestamp));
      Logger.debug("Parâmetros de geração de flashcards salvos:", paramsWithTimestamp);

      // Adicionar ao histórico
      await this.addToHistory(paramsWithTimestamp);
    } catch (error) {
      Logger.error("Erro ao salvar parâmetros de geração de flashcards:", error);
    }
  }

  /**
   * Salva os parâmetros de exportação de flashcards para o Anki
   */
  static async saveExportParameters(parameters: FlashcardExportParameters): Promise<void> {
    try {
      await LocalStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(parameters));
      Logger.debug("Parâmetros de exportação de flashcards salvos:", parameters);

      // Atualizar os parâmetros de geração com informações de exportação
      const lastParams = await this.getLastParameters();
      if (lastParams) {
        await this.saveParameters({
          ...lastParams,
          deckName: parameters.deckName,
          modelName: parameters.modelName,
          customTags: parameters.tags,
          exportedCount: parameters.count,
        });
      }
    } catch (error) {
      Logger.error("Erro ao salvar parâmetros de exportação de flashcards:", error);
    }
  }

  /**
   * Adiciona parâmetros ao histórico, mantendo um número máximo de itens
   */
  private static async addToHistory(parameters: FlashcardGenerationParameters): Promise<void> {
    try {
      const historyJson = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
      let history: FlashcardGenerationParameters[] = [];

      if (historyJson) {
        history = JSON.parse(historyJson);
      }

      // Adicionar novo item ao início
      history.unshift(parameters);

      // Limitar o tamanho do histórico
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }

      await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      Logger.error("Erro ao adicionar parâmetros ao histórico:", error);
    }
  }

  /**
   * Recupera os últimos parâmetros de geração de flashcards
   */
  static async getLastParameters(): Promise<FlashcardGenerationParameters | null> {
    try {
      const storedParams = await LocalStorage.getItem<string>(STORAGE_KEY);

      if (storedParams) {
        const params = JSON.parse(storedParams) as FlashcardGenerationParameters;
        Logger.debug("Parâmetros de geração de flashcards recuperados:", params);
        return params;
      }

      return null;
    } catch (error) {
      Logger.error("Erro ao recuperar parâmetros de geração de flashcards:", error);
      return null;
    }
  }

  /**
   * Recupera os últimos parâmetros de exportação de flashcards
   */
  static async getLastExportParameters(): Promise<FlashcardExportParameters | null> {
    try {
      const storedParams = await LocalStorage.getItem<string>(EXPORT_STORAGE_KEY);

      if (storedParams) {
        const params = JSON.parse(storedParams) as FlashcardExportParameters;
        Logger.debug("Parâmetros de exportação de flashcards recuperados:", params);
        return params;
      }

      return null;
    } catch (error) {
      Logger.error("Erro ao recuperar parâmetros de exportação de flashcards:", error);
      return null;
    }
  }

  /**
   * Recupera o histórico de parâmetros de geração de flashcards
   */
  static async getParametersHistory(): Promise<FlashcardGenerationParameters[]> {
    try {
      const historyJson = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);

      if (historyJson) {
        return JSON.parse(historyJson) as FlashcardGenerationParameters[];
      }

      return [];
    } catch (error) {
      Logger.error("Erro ao recuperar histórico de parâmetros:", error);
      return [];
    }
  }

  /**
   * Retorna uma string formatada com a data e hora da última geração
   */
  static formatLastUsedTime(timestamp?: number): string {
    if (!timestamp) return "Nunca utilizado";

    const date = new Date(timestamp);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Retorna uma string resumida com os últimos parâmetros utilizados
   */
  static getParameterSummary(params: FlashcardGenerationParameters | null): string {
    if (!params) return "Sem parâmetros anteriores";

    const elements = [];

    if (params.language) elements.push(`Idioma: ${params.language}`);
    if (params.model) elements.push(`Modelo: ${params.model}`);
    if (params.deckName) elements.push(`Deck: ${params.deckName}`);
    if (params.modelName) elements.push(`Modelo Anki: ${params.modelName}`);
    if (params.minFlashcards) elements.push(`Min: ${params.minFlashcards}`);
    if (params.maxFlashcards) elements.push(`Max: ${params.maxFlashcards}`);
    if (params.enableTags !== undefined) elements.push(`Tags: ${params.enableTags ? "Sim" : "Não"}`);
    if (params.generatedCount) elements.push(`Gerados: ${params.generatedCount}`);
    if (params.exportedCount) elements.push(`Exportados: ${params.exportedCount}`);

    if (elements.length === 0) return "Parâmetros padrão";

    return elements.join(" | ");
  }

  /**
   * Retorna uma string formatada com os detalhes completos dos parâmetros
   */
  static getDetailedParameterSummary(params: FlashcardGenerationParameters | null): string {
    if (!params) return "Sem parâmetros anteriores";

    const lines = [];

    if (params.timestamp) lines.push(`Data: ${this.formatLastUsedTime(params.timestamp)}`);
    if (params.language) lines.push(`Idioma: ${params.language}`);
    if (params.model) lines.push(`Modelo de IA: ${params.model}`);
    if (params.textLength) lines.push(`Tamanho do texto: ${params.textLength} caracteres`);
    if (params.minFlashcards) lines.push(`Mínimo de flashcards: ${params.minFlashcards}`);
    if (params.maxFlashcards) lines.push(`Máximo de flashcards: ${params.maxFlashcards}`);
    if (params.enableTags !== undefined) lines.push(`Geração de tags: ${params.enableTags ? "Ativada" : "Desativada"}`);
    if (params.generatedCount) lines.push(`Flashcards gerados: ${params.generatedCount}`);

    if (params.deckName || params.modelName || params.exportedCount) {
      lines.push("\nInformações de exportação:");
      if (params.deckName) lines.push(`Deck: ${params.deckName}`);
      if (params.modelName) lines.push(`Modelo Anki: ${params.modelName}`);
      if (params.customTags && params.customTags.length > 0) lines.push(`Tags: ${params.customTags.join(", ")}`);
      if (params.exportedCount) lines.push(`Flashcards exportados: ${params.exportedCount}`);
    }

    if (lines.length === 0) return "Parâmetros padrão";

    return lines.join("\n");
  }
}
