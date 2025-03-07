import { GeminiService } from "./geminiService";
import { ApiKeyManager } from "../utils/apiKeyManager";
import { Flashcard } from "./flashcardGenerator";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";

export class GeminiEnhancer {
  /**
   * Melhora um flashcard existente adicionando exemplos e informações adicionais
   */
  static async enhanceFlashcard(flashcard: Flashcard): Promise<Flashcard> {
    try {
      Logger.info(`Melhorando flashcard com Gemini: ${flashcard.front}`);

      // Obter a chave de API
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada");
      }

      // Criar instância do serviço Gemini
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Melhore o seguinte flashcard adicionando exemplos práticos e informações adicionais relevantes no campo "extra".
      O conteúdo deve ser educativo, claro e ajudar a fixar o conceito.
      
      Flashcard:
      Frente: ${flashcard.front}
      Verso: ${flashcard.back}
      ${flashcard.extra ? `Extra atual: ${flashcard.extra}` : ""}
      
      Retorne apenas o texto para o campo "extra" melhorado, sem formatação adicional.
      `;

      const response = await geminiService.ask(prompt);

      return {
        ...flashcard,
        extra: response.trim(),
      };
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return flashcard;
    }
  }

  /**
   * Gera exemplos adicionais para um conceito
   */
  static async generateExamples(concept: string, count: number = 3): Promise<string[]> {
    try {
      Logger.info(`Gerando exemplos com Gemini para: ${concept}`);

      // Obter a chave de API
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada");
      }

      // Criar instância do serviço Gemini
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Gere ${count} exemplos práticos e claros para ilustrar o seguinte conceito:
      
      "${concept}"
      
      Retorne apenas os exemplos, um por linha, sem numeração ou formatação adicional.
      `;

      const response = await geminiService.ask(prompt);

      return response
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, count);
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return [];
    }
  }

  /**
   * Avalia a qualidade de um flashcard e sugere melhorias
   */
  static async evaluateFlashcard(flashcard: Flashcard): Promise<{ score: number; suggestions: string[] }> {
    try {
      Logger.info(`Avaliando flashcard com Gemini: ${flashcard.front}`);

      // Obter a chave de API
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada");
      }

      // Criar instância do serviço Gemini
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Avalie a qualidade do seguinte flashcard em uma escala de 1 a 10 e forneça até 3 sugestões específicas para melhorá-lo.
      
      Flashcard:
      Frente: ${flashcard.front}
      Verso: ${flashcard.back}
      ${flashcard.extra ? `Extra: ${flashcard.extra}` : ""}
      
      Retorne a resposta no formato JSON:
      {
        "score": número de 1 a 10,
        "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"]
      }
      `;

      const response = await geminiService.ask(prompt);

      try {
        // Tenta extrair apenas o JSON se houver texto adicional
        const jsonMatch = response.match(/\{.*\}/s);
        const jsonString = jsonMatch ? jsonMatch[0] : response;

        const result = JSON.parse(jsonString);
        return {
          score: result.score || 5,
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        };
      } catch (error) {
        Logger.error("Erro ao processar avaliação do Gemini", error);
        return { score: 5, suggestions: [] };
      }
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return { score: 5, suggestions: [] };
    }
  }

  /**
   * Gera perguntas relacionadas a um tópico para criar flashcards adicionais
   */
  static async generateRelatedQuestions(
    topic: string,
    count: number = 5,
  ): Promise<{ question: string; answer: string }[]> {
    try {
      Logger.info(`Gerando perguntas relacionadas com Gemini a: ${topic}`);

      // Obter a chave de API
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada");
      }

      // Criar instância do serviço Gemini
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Gere ${count} perguntas e respostas relacionadas ao seguinte tópico para criar flashcards adicionais:
      
      "${topic}"
      
      Retorne a resposta no formato JSON:
      [
        {
          "question": "Pergunta 1",
          "answer": "Resposta 1"
        },
        ...
      ]
      `;

      const response = await geminiService.ask(prompt);

      try {
        // Tenta extrair apenas o JSON se houver texto adicional
        const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
        const jsonString = jsonMatch ? jsonMatch[0] : response;

        const result = JSON.parse(jsonString);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        Logger.error("Erro ao processar perguntas relacionadas do Gemini", error);
        return [];
      }
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return [];
    }
  }
}
