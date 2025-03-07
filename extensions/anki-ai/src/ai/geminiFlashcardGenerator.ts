import { GeminiService } from "./geminiService";
import { ApiKeyManager } from "../utils/apiKeyManager";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";
import { Flashcard } from "./flashcardGenerator";

export class GeminiFlashcardGenerator {
  static async generate(
    text: string,
    options?: {
      model?: string;
      language?: string;
    },
  ): Promise<Flashcard[]> {
    try {
      const model = options?.model || "gemini-1.5-flash";
      const language = options?.language || "português";

      Logger.info(`Gerando flashcards com modelo Gemini ${model}`);

      // Obter a chave de API
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada");
      }

      // Criar instância do serviço Gemini
      const geminiService = new GeminiService(apiKey, model);

      // Construir o prompt e fazer a solicitação
      const prompt = this.buildPrompt(text, language);
      const response = await geminiService.ask(prompt);

      Logger.debug("Resposta do Gemini", response);

      return this.parseResponse(response);
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return [];
    }
  }

  private static buildPrompt(text: string, language: string): string {
    return `Transforme o seguinte texto em flashcards no formato JSON com campos "front", "back" e "extra". 
    O campo "front" deve conter uma pergunta ou conceito.
    O campo "back" deve conter a resposta ou explicação concisa.
    O campo "extra" deve conter informações adicionais, exemplos ou contexto que ajudem a entender melhor o conceito.
    Crie flashcards que sigam o princípio da atomicidade (uma ideia por cartão).
    Retorne apenas o array JSON sem explicações adicionais.
    Idioma: ${language}
    
    Texto:
    "${text}"`;
  }

  private static parseResponse(response: string): Flashcard[] {
    try {
      // Tenta extrair apenas o JSON se houver texto adicional
      const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      const flashcards = JSON.parse(jsonString) as Flashcard[];

      // Validação básica
      if (!Array.isArray(flashcards)) {
        throw new Error("Resposta não é um array");
      }

      // Filtra flashcards inválidos
      return flashcards
        .filter((card) => card && typeof card.front === "string" && typeof card.back === "string")
        .map((card) => ({
          ...card,
          extra: card.extra || "", // Garante que o campo extra sempre existe
        }));
    } catch (error) {
      Logger.error("Erro ao processar resposta do Gemini", error);
      return [];
    }
  }

  /**
   * Método para testar a conexão com a API Gemini
   */
  static async testConnection(): Promise<boolean> {
    try {
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        return false;
      }

      const geminiService = new GeminiService(apiKey);
      await geminiService.ask("Teste de conexão");

      return true;
    } catch (error) {
      Logger.error("Erro ao testar conexão com Gemini", error);
      return false;
    }
  }
}
