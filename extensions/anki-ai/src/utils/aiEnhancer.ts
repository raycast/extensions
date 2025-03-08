import { AI } from "@raycast/api";
import { Flashcard } from "../ai/flashcardGenerator";
import { Logger } from "./logger";
import { getAIModelIdentifier } from "../constants/aiModels";
import { getCustomPreferences } from "../preferences";

/**
 * Interface for the result of a flashcard evaluation
 */
export interface FlashcardEvaluation {
  score: number;
  suggestions: string[];
}

/**
 * Utility class for enhancing flashcards using AI
 */
export class AIEnhancer {
  /**
   * Enhances an existing flashcard using AI
   * @param flashcard Flashcard to be enhanced
   * @returns Enhanced flashcard
   */
  static async enhanceFlashcard(flashcard: Flashcard): Promise<Flashcard> {
    try {
      // Get custom preferences
      const preferences = await getCustomPreferences();
      const enhancementPrompt = preferences.enhancementPrompt;
      const enhancementModel = preferences.enhancementModel;
      const maxTags = preferences.maxTags || 2;

      // Build the prompt for AI
      const prompt = `${enhancementPrompt}
      
Current flashcard:
- Question: ${flashcard.front}
- Answer: ${flashcard.back}
${flashcard.extra ? `- Extra information: ${flashcard.extra}` : ""}
${flashcard.tags && flashcard.tags.length > 0 ? `- Current tags: ${flashcard.tags.join(", ")}` : ""}

Return the enhanced flashcard in JSON format with fields "front", "back", "extra", and "tags".
Maintain the same difficulty level: ${flashcard.difficulty || "intermediate"}.
Limit tags to a maximum of ${maxTags} relevant terms.
${flashcard.tags && flashcard.tags.length > 0 ? "Consider keeping existing tags if relevant." : ""}`;

      Logger.debug(`Enhancing flashcard with model: ${enhancementModel}`);

      // Get the model identifier
      const modelId = getAIModelIdentifier(enhancementModel) || "openai-gpt-4o";

      // Make the AI call
      const response = await AI.ask(prompt, {
        model: modelId as AI.Model,
        creativity: 0.7,
      });

      // Process the response
      return this.parseEnhancedFlashcard(response, flashcard);
    } catch (error) {
      Logger.error("Error enhancing flashcard:", error);
      return flashcard; // Return the original flashcard in case of error
    }
  }

  /**
   * Parses the AI response to extract the enhanced flashcard
   * @param response AI response
   * @param originalFlashcard Original flashcard
   * @returns Enhanced flashcard
   */
  private static parseEnhancedFlashcard(response: string, originalFlashcard: Flashcard): Flashcard {
    try {
      // Extract JSON substring between first '{' and last '}'
      const firstBrace = response.indexOf("{");
      const lastBrace = response.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = response.substring(firstBrace, lastBrace + 1);
        try {
          const enhancedCard = JSON.parse(jsonString);

          // Ensure all necessary fields are present
          const result: Flashcard = {
            front: enhancedCard.front || originalFlashcard.front,
            back: enhancedCard.back || originalFlashcard.back,
            extra: enhancedCard.extra || originalFlashcard.extra,
            difficulty: originalFlashcard.difficulty,
          };

          // Process tags, limiting to the defined maximum
          if (enhancedCard.tags && Array.isArray(enhancedCard.tags)) {
            // Get preferences for the maximum number of tags
            getCustomPreferences().then((prefs) => {
              const maxTags = prefs.maxTags || 2;

              // Limit the number of tags
              result.tags = enhancedCard.tags.slice(0, maxTags);
            });
          } else {
            result.tags = originalFlashcard.tags;
          }

          return result;
        } catch (e) {
          Logger.warn("Failed to parse JSON in the response", e);
        }
      }

      // Fallback: manually extract if JSON is not found
      Logger.warn("Using fallback method to extract enhanced flashcard");

      const frontMatch = response.match(/Question|Front:?\s*(.+?)(?=Answer|Back|$)/is);
      const backMatch = response.match(/Answer|Back:?\s*(.+?)(?=Extra|Information|Tags|$)/is);
      const extraMatch = response.match(/Extra|Information:?\s*(.+?)(?=Tags|$)/is);
      const tagsMatch = response.match(/Tags:?\s*(.+?)$/is);

      // Build the enhanced flashcard
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
      Logger.error("Error processing enhanced flashcard:", error);
      return originalFlashcard; // Return the original flashcard in case of error
    }
  }

  /**
   * Evaluates the quality of a flashcard
   * @param flashcard Flashcard to be evaluated
   * @returns Flashcard evaluation
   */
  static async evaluateFlashcard(flashcard: Flashcard): Promise<FlashcardEvaluation> {
    try {
      // Get custom preferences
      const preferences = await getCustomPreferences();
      const evaluationModel = preferences.enhancementModel;

      // Build the prompt for AI
      const prompt = `Evaluate the quality of this flashcard on a scale of 1 to 10 and provide suggestions for improvement.

Flashcard:
- Question: ${flashcard.front}
- Answer: ${flashcard.back}
${flashcard.extra ? `- Extra information: ${flashcard.extra}` : ""}
${flashcard.tags && flashcard.tags.length > 0 ? `- Tags: ${flashcard.tags.join(", ")}` : ""}

Return the evaluation in JSON format with fields "score" (number from 1 to 10) and "suggestions" (array of strings with suggestions).`;

      // Get the model identifier
      const modelId = getAIModelIdentifier(evaluationModel) || "openai-gpt-4o";

      // Make the AI call
      const response = await AI.ask(prompt, {
        model: modelId as AI.Model,
        creativity: 0.5,
      });

      // Process the response
      return this.parseEvaluation(response);
    } catch (error) {
      Logger.error("Error evaluating flashcard:", error);
      return { score: 5, suggestions: ["Unable to evaluate the flashcard."] };
    }
  }

  /**
   * Parses the AI response to extract the flashcard evaluation
   * @param response AI response
   * @returns Flashcard evaluation
   */
  private static parseEvaluation(response: string): FlashcardEvaluation {
    try {
      // Extract JSON substring between first '{' and last '}'
      const firstBrace = response.indexOf("{");
      const lastBrace = response.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = response.substring(firstBrace, lastBrace + 1);
        try {
          const evaluation = JSON.parse(jsonString);
          if (typeof evaluation.score === "number" && Array.isArray(evaluation.suggestions)) {
            return {
              score: evaluation.score,
              suggestions: evaluation.suggestions,
            };
          }
        } catch (e) {
          Logger.warn("Failed to parse JSON in the evaluation response", e);
        }
      }

      // Fallback: manually extract if JSON is not found
      Logger.warn("Using fallback method to extract evaluation");

      const scoreMatch = response.match(/score:?\s*(\d+)/i);
      const suggestionsMatch = response.match(/suggestions:?\s*(.+?)$/is);

      return {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
        suggestions: suggestionsMatch
          ? suggestionsMatch[1]
              .split(/[\n.]/)
              .filter((s) => s.trim().length > 0)
              .map((s) => s.trim())
          : ["Unable to extract suggestions."],
      };
    } catch (error) {
      Logger.error("Error processing evaluation:", error);
      return { score: 5, suggestions: ["Error processing the evaluation."] };
    }
  }

  /**
   * Generates questions related to a topic
   * @param topic Topic to generate questions for
   * @param count Number of questions to be generated
   * @param options Additional options
   * @returns Array of questions and answers
   */
  static async generateRelatedQuestions(
    topic: string,
    count: number = 5,
    options?: { model?: string },
  ): Promise<Array<{ question: string; answer: string }>> {
    try {
      // Get custom preferences
      const preferences = await getCustomPreferences();
      const model = options?.model || preferences.defaultModel;

      // Build the prompt for AI
      const prompt = `Generate ${count} questions and answers related to the topic "${topic}".
      
The questions should be interesting, educational, and varied in terms of difficulty.
Return the questions and answers in JSON format as an array of objects with fields "question" and "answer".`;

      // Get the model identifier
      const modelId = getAIModelIdentifier(model) || "openai-gpt-4o";

      // Make the AI call
      const response = await AI.ask(prompt, {
        model: modelId as AI.Model,
        creativity: 0.8,
      });

      // Process the response
      return this.parseRelatedQuestions(response);
    } catch (error) {
      Logger.error("Error generating related questions:", error);
      return [];
    }
  }

  /**
   * Parses the AI response to extract questions and answers
   * @param response AI response
   * @returns Array of questions and answers
   */
  private static parseRelatedQuestions(response: string): Array<{ question: string; answer: string }> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          const questions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(questions)) {
            return questions.filter((q) => q.question && q.answer);
          }
        } catch (e) {
          Logger.warn("Failed to parse JSON in the related questions response", e);
        }
      }

      // Fallback: manually extract if JSON is not found
      Logger.warn("Using fallback method to extract related questions");

      const questions: Array<{ question: string; answer: string }> = [];
      const lines = response.split("\n");
      let currentQuestion = "";

      for (const line of lines) {
        const questionMatch = line.match(/^\d+\.\s*(.+?)\?/);
        const answerMatch = line.match(/^Answer|^A:/i);

        if (questionMatch) {
          currentQuestion = questionMatch[1].trim() + "?";
        } else if (answerMatch && currentQuestion) {
          const answer = line.replace(/^Answer|^A:/i, "").trim();
          questions.push({ question: currentQuestion, answer });
          currentQuestion = "";
        }
      }

      return questions;
    } catch (error) {
      Logger.error("Error processing related questions:", error);
      return [];
    }
  }
}
