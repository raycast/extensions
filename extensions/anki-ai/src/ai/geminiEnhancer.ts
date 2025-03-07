import { GeminiService } from "./geminiService";
import { ApiKeyManager } from "../utils/apiKeyManager";
import { Flashcard } from "./flashcardGenerator";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";

export class GeminiEnhancer {
  /**
   * Enhances an existing flashcard by adding examples and additional information
   */
  static async enhanceFlashcard(flashcard: Flashcard): Promise<Flashcard> {
    try {
      Logger.info(`Enhancing flashcard with Gemini: ${flashcard.front}`);

      // Get the API key
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }

      // Create Gemini service instance
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Improve the following flashcard by adding practical examples and relevant additional information in the "extra" field.
      The content should be educational, clear, and help reinforce the concept.
      
      Flashcard:
      Front: ${flashcard.front}
      Back: ${flashcard.back}
      ${flashcard.extra ? `Current Extra: ${flashcard.extra}` : ""}
      
      Return only the text for the improved "extra" field, without additional formatting.
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
   * Generates additional examples for a concept
   */
  static async generateExamples(concept: string, count: number = 3): Promise<string[]> {
    try {
      Logger.info(`Generating examples with Gemini for: ${concept}`);

      // Get the API key
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }

      // Create Gemini service instance
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Generate ${count} practical and clear examples to illustrate the following concept:
      
      "${concept}"
      
      Return only the examples, one per line, without numbering or additional formatting.
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
   * Evaluates the quality of a flashcard and suggests improvements
   */
  static async evaluateFlashcard(flashcard: Flashcard): Promise<{ score: number; suggestions: string[] }> {
    try {
      Logger.info(`Evaluating flashcard with Gemini: ${flashcard.front}`);

      // Get the API key
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }

      // Create Gemini service instance
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Evaluate the quality of the following flashcard on a scale of 1 to 10 and provide up to 3 specific suggestions to improve it.
      
      Flashcard:
      Front: ${flashcard.front}
      Back: ${flashcard.back}
      ${flashcard.extra ? `Extra: ${flashcard.extra}` : ""}
      
      Return the response in JSON format:
      {
        "score": number from 1 to 10,
        "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
      }
      `;

      const response = await geminiService.ask(prompt);

      try {
        // Try to extract only the JSON if there is additional text
        const jsonMatch = response.match(/\{.*\}/s);
        const jsonString = jsonMatch ? jsonMatch[0] : response;

        const result = JSON.parse(jsonString);
        return {
          score: result.score || 5,
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        };
      } catch (error) {
        Logger.error("Error processing Gemini evaluation", error);
        return { score: 5, suggestions: [] };
      }
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return { score: 5, suggestions: [] };
    }
  }

  /**
   * Generates related questions to a topic to create additional flashcards
   */
  static async generateRelatedQuestions(
    topic: string,
    count: number = 5,
  ): Promise<{ question: string; answer: string }[]> {
    try {
      Logger.info(`Generating related questions with Gemini for: ${topic}`);

      // Get the API key
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }

      // Create Gemini service instance
      const geminiService = new GeminiService(apiKey);

      const prompt = `
      Generate ${count} questions and answers related to the following topic to create additional flashcards:
      
      "${topic}"
      
      Return the response in JSON format:
      [
        {
          "question": "Question 1",
          "answer": "Answer 1"
        },
        ...
      ]
      `;

      const response = await geminiService.ask(prompt);

      try {
        // Try to extract only the JSON if there is additional text
        const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
        const jsonString = jsonMatch ? jsonMatch[0] : response;

        const result = JSON.parse(jsonString);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        Logger.error("Error processing related questions from Gemini", error);
        return [];
      }
    } catch (error) {
      ErrorHandler.handleAIError(error);
      return [];
    }
  }
}
