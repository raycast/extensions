import { LocalStorage } from "@raycast/api";
import { Logger } from "./logger";

/**
 * Gerenciador para armazenar e recuperar chaves de API de forma segura
 */
export class ApiKeyManager {
  private static readonly GEMINI_API_KEY = "gemini_api_key";

  /**
   * Salva a chave de API do Gemini
   */
  static async saveGeminiApiKey(apiKey: string): Promise<void> {
    try {
      await LocalStorage.setItem(this.GEMINI_API_KEY, apiKey);
      Logger.info("Chave de API do Gemini salva com sucesso");
    } catch (error) {
      Logger.error("Erro ao salvar chave de API do Gemini", error);
      throw new Error("Não foi possível salvar a chave de API");
    }
  }

  /**
   * Recupera a chave de API do Gemini
   */
  static async getGeminiApiKey(): Promise<string | undefined> {
    try {
      const apiKey = await LocalStorage.getItem<string>(this.GEMINI_API_KEY);
      return apiKey;
    } catch (error) {
      Logger.error("Erro ao recuperar chave de API do Gemini", error);
      return undefined;
    }
  }

  /**
   * Remove a chave de API do Gemini
   */
  static async removeGeminiApiKey(): Promise<void> {
    try {
      await LocalStorage.removeItem(this.GEMINI_API_KEY);
      Logger.info("Chave de API do Gemini removida com sucesso");
    } catch (error) {
      Logger.error("Erro ao remover chave de API do Gemini", error);
      throw new Error("Não foi possível remover a chave de API");
    }
  }

  /**
   * Verifica se a chave de API do Gemini está configurada
   */
  static async isGeminiApiKeyConfigured(): Promise<boolean> {
    const apiKey = await this.getGeminiApiKey();
    return !!apiKey && apiKey.trim().length > 0;
  }
}
