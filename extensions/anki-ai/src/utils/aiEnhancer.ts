import { AI } from "@raycast/api";
import { Flashcard } from "../ai/flashcardGenerator";
import { Logger } from "./logger";
import { getAIModelIdentifier } from "../constants/aiModels";
import { getCustomPreferences } from "../preferences";

/**
 * Interface para o resultado da avaliação de um flashcard
 */
export interface FlashcardEvaluation {
  score: number;
  suggestions: string[];
}

/**
 * Classe utilitária para aprimorar flashcards usando IA
 */
export class AIEnhancer {
  /**
   * Melhora um flashcard existente usando IA
   * @param flashcard Flashcard a ser melhorado
   * @returns Flashcard melhorado
   */
  static async enhanceFlashcard(flashcard: Flashcard): Promise<Flashcard> {
    try {
      // Obter preferências personalizadas
      const preferences = await getCustomPreferences();
      const enhancementPrompt = preferences.enhancementPrompt;
      const enhancementModel = preferences.enhancementModel;
      const maxTags = preferences.maxTags || 2;

      // Construir o prompt para a IA
      const prompt = `${enhancementPrompt}
      
Flashcard atual:
- Pergunta: ${flashcard.front}
- Resposta: ${flashcard.back}
${flashcard.extra ? `- Informações extras: ${flashcard.extra}` : ""}
${flashcard.tags && flashcard.tags.length > 0 ? `- Tags atuais: ${flashcard.tags.join(", ")}` : ""}

Retorne o flashcard melhorado no formato JSON com os campos "front", "back", "extra" e "tags".
Mantenha o mesmo nível de dificuldade: ${flashcard.difficulty || "intermediário"}.
Limite as tags a no máximo ${maxTags} termos relevantes.
${flashcard.tags && flashcard.tags.length > 0 ? "Considere manter as tags existentes se forem relevantes." : ""}`;

      Logger.debug(`Aprimorando flashcard com modelo: ${enhancementModel}`);

      // Obter o identificador do modelo
      const modelId = getAIModelIdentifier(enhancementModel) || "openai-gpt-4o";

      // Fazer a chamada para a IA
      // @ts-expect-error - Model ID do tipo string não é diretamente compatível com AI.Model
      const response = await AI.ask(prompt, {
        model: modelId,
        creativity: 0.7,
      });

      // Processar a resposta
      return this.parseEnhancedFlashcard(response, flashcard);
    } catch (error) {
      Logger.error("Erro ao aprimorar flashcard:", error);
      return flashcard; // Retorna o flashcard original em caso de erro
    }
  }

  /**
   * Analisa a resposta da IA para extrair o flashcard melhorado
   * @param response Resposta da IA
   * @param originalFlashcard Flashcard original
   * @returns Flashcard melhorado
   */
  private static parseEnhancedFlashcard(response: string, originalFlashcard: Flashcard): Flashcard {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const enhancedCard = JSON.parse(jsonMatch[0]);

          // Garantir que todos os campos necessários estejam presentes
          const result: Flashcard = {
            front: enhancedCard.front || originalFlashcard.front,
            back: enhancedCard.back || originalFlashcard.back,
            extra: enhancedCard.extra || originalFlashcard.extra,
            difficulty: originalFlashcard.difficulty,
          };

          // Processar tags, limitando ao máximo definido
          if (enhancedCard.tags && Array.isArray(enhancedCard.tags)) {
            // Obter preferências para o número máximo de tags
            getCustomPreferences().then((prefs) => {
              const maxTags = prefs.maxTags || 2;

              // Limitar o número de tags
              result.tags = enhancedCard.tags.slice(0, maxTags);
            });
          } else {
            result.tags = originalFlashcard.tags;
          }

          return result;
        } catch (e) {
          Logger.warn("Falha ao fazer parse do JSON na resposta", e);
        }
      }

      // Fallback: extrair manualmente se o JSON não for encontrado
      Logger.warn("Usando método de fallback para extrair flashcard melhorado");

      const frontMatch = response.match(/Pergunta|Front|Frente:?\s*(.+?)(?=Resposta|Back|Verso|$)/is);
      const backMatch = response.match(/Resposta|Back|Verso:?\s*(.+?)(?=Extra|Informações|Tags|$)/is);
      const extraMatch = response.match(/Extra|Informações:?\s*(.+?)(?=Tags|$)/is);
      const tagsMatch = response.match(/Tags|Etiquetas:?\s*(.+?)$/is);

      // Construir o flashcard melhorado
      return {
        front: frontMatch ? frontMatch[1].trim() : originalFlashcard.front,
        back: backMatch ? backMatch[1].trim() : originalFlashcard.back,
        extra: extraMatch ? extraMatch[1].trim() : originalFlashcard.extra,
        tags: tagsMatch
          ? tagsMatch[1]
              .split(/[,;]/)
              .map((tag) => tag.trim())
              .slice(0, 2)
          : originalFlashcard.tags,
        difficulty: originalFlashcard.difficulty,
      };
    } catch (error) {
      Logger.error("Erro ao processar flashcard melhorado:", error);
      return originalFlashcard; // Retorna o flashcard original em caso de erro
    }
  }

  /**
   * Avalia a qualidade de um flashcard
   * @param flashcard Flashcard a ser avaliado
   * @returns Avaliação do flashcard
   */
  static async evaluateFlashcard(flashcard: Flashcard): Promise<FlashcardEvaluation> {
    try {
      // Obter preferências personalizadas
      const preferences = await getCustomPreferences();
      const evaluationModel = preferences.enhancementModel;

      // Construir o prompt para a IA
      const prompt = `Avalie a qualidade deste flashcard em uma escala de 1 a 10 e forneça sugestões de melhoria.

Flashcard:
- Pergunta: ${flashcard.front}
- Resposta: ${flashcard.back}
${flashcard.extra ? `- Informações extras: ${flashcard.extra}` : ""}
${flashcard.tags && flashcard.tags.length > 0 ? `- Tags: ${flashcard.tags.join(", ")}` : ""}

Retorne a avaliação no formato JSON com os campos "score" (número de 1 a 10) e "suggestions" (array de strings com sugestões).`;

      // Obter o identificador do modelo
      const modelId = getAIModelIdentifier(evaluationModel) || "openai-gpt-4o";

      // Fazer a chamada para a IA
      // @ts-expect-error - Model ID do tipo string não é diretamente compatível com AI.Model
      const response = await AI.ask(prompt, {
        model: modelId,
        creativity: 0.5,
      });

      // Processar a resposta
      return this.parseEvaluation(response);
    } catch (error) {
      Logger.error("Erro ao avaliar flashcard:", error);
      return { score: 5, suggestions: ["Não foi possível avaliar o flashcard."] };
    }
  }

  /**
   * Analisa a resposta da IA para extrair a avaliação do flashcard
   * @param response Resposta da IA
   * @returns Avaliação do flashcard
   */
  private static parseEvaluation(response: string): FlashcardEvaluation {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const evaluation = JSON.parse(jsonMatch[0]);
          if (typeof evaluation.score === "number" && Array.isArray(evaluation.suggestions)) {
            return {
              score: evaluation.score,
              suggestions: evaluation.suggestions,
            };
          }
        } catch (e) {
          Logger.warn("Falha ao fazer parse do JSON na resposta de avaliação", e);
        }
      }

      // Fallback: extrair manualmente se o JSON não for encontrado
      Logger.warn("Usando método de fallback para extrair avaliação");

      const scoreMatch = response.match(/score|pontuação|nota:?\s*(\d+)/i);
      const suggestionsMatch = response.match(/sugestões|suggestions:?\s*(.+?)$/is);

      return {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
        suggestions: suggestionsMatch
          ? suggestionsMatch[1]
              .split(/[\n.]/)
              .filter((s) => s.trim().length > 0)
              .map((s) => s.trim())
          : ["Não foi possível extrair sugestões."],
      };
    } catch (error) {
      Logger.error("Erro ao processar avaliação:", error);
      return { score: 5, suggestions: ["Erro ao processar a avaliação."] };
    }
  }

  /**
   * Gera perguntas relacionadas a um tópico
   * @param topic Tópico para gerar perguntas
   * @param count Número de perguntas a serem geradas
   * @param options Opções adicionais
   * @returns Array de perguntas e respostas
   */
  static async generateRelatedQuestions(
    topic: string,
    count: number = 5,
    options?: { model?: string },
  ): Promise<Array<{ question: string; answer: string }>> {
    try {
      // Obter preferências personalizadas
      const preferences = await getCustomPreferences();
      const model = options?.model || preferences.defaultModel;

      // Construir o prompt para a IA
      const prompt = `Gere ${count} perguntas e respostas relacionadas ao tópico "${topic}".
      
As perguntas devem ser interessantes, educativas e variadas em termos de dificuldade.
Retorne as perguntas e respostas no formato JSON como um array de objetos com os campos "question" e "answer".`;

      // Obter o identificador do modelo
      const modelId = getAIModelIdentifier(model) || "openai-gpt-4o";

      // Fazer a chamada para a IA
      // @ts-expect-error - Model ID do tipo string não é diretamente compatível com AI.Model, mas é necessário para a funcionalidade
      const response = await AI.ask(prompt, {
        model: modelId,
        creativity: 0.8,
      });

      // Processar a resposta
      return this.parseRelatedQuestions(response);
    } catch (error) {
      Logger.error("Erro ao gerar perguntas relacionadas:", error);
      return [];
    }
  }

  /**
   * Analisa a resposta da IA para extrair perguntas e respostas
   * @param response Resposta da IA
   * @returns Array de perguntas e respostas
   */
  private static parseRelatedQuestions(response: string): Array<{ question: string; answer: string }> {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          const questions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(questions)) {
            return questions.filter((q) => q.question && q.answer);
          }
        } catch (e) {
          Logger.warn("Falha ao fazer parse do JSON na resposta de perguntas relacionadas", e);
        }
      }

      // Fallback: extrair manualmente se o JSON não for encontrado
      Logger.warn("Usando método de fallback para extrair perguntas relacionadas");

      const questions: Array<{ question: string; answer: string }> = [];
      const lines = response.split("\n");
      let currentQuestion = "";

      for (const line of lines) {
        const questionMatch = line.match(/^\d+\.\s*(.+?)\?/);
        const answerMatch = line.match(/^Resposta|^R:|^A:/i);

        if (questionMatch) {
          currentQuestion = questionMatch[1].trim() + "?";
        } else if (answerMatch && currentQuestion) {
          const answer = line.replace(/^Resposta|^R:|^A:/i, "").trim();
          questions.push({ question: currentQuestion, answer });
          currentQuestion = "";
        }
      }

      return questions;
    } catch (error) {
      Logger.error("Erro ao processar perguntas relacionadas:", error);
      return [];
    }
  }
}
