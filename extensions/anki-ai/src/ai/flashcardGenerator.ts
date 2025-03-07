import { AI } from "@raycast/api";
import { NetworkHelper } from "../utils/networkHelper";

/**
 * Interface that defines the structure of a flashcard
 */
export interface Flashcard {
  front: string;
  back: string;
  extra?: string;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
}

/**
 * Interface that defines the options for flashcard generation
 */
export interface FlashcardGenerationOptions {
  language?: string;
  numCards?: number;
  model?: string;
  difficultyLevel?: "beginner" | "intermediate" | "advanced";
  minFlashcards?: number;
  maxFlashcards?: number;
  customPrompt?: string;
  enableTags?: boolean;
  creativity?: number;
}

/**
 * Class responsible for generating flashcards from text using AI
 */
export class FlashcardGenerator {
  /**
   * Generates flashcards from a text
   * @param text Text to generate flashcards from
   * @param options Generation options
   * @returns Array of generated flashcards
   */
  public static async generate(text: string, options: FlashcardGenerationOptions = {}): Promise<Flashcard[]> {
    try {
      const prompt = `Transform the following text into flashcards in JSON format with "front", "back", and "extra" fields. 
        The "front" field should contain a question or concept.
        The "back" field should contain a concise answer or explanation.
        The "extra" field should contain additional information, examples, or context that helps better understand the concept.
        Create flashcards that follow the principle of atomicity (one idea per card).
        Generate between ${options.minFlashcards || 1} and ${options.maxFlashcards || 5} flashcards.
        Return only the JSON array without additional explanations.
        Language: ${options.language || "english"}
        Make sure the flashcards are at the ${options.difficultyLevel || "intermediate"} difficulty level.
        ${options.enableTags ? 'Add a "tags" field with a maximum of 2 relevant keywords for each flashcard.' : ""}
        Tags should be short, specific terms that categorize the content.
        Avoid generic tags like "knowledge", "information", or "learning".
        
        Text:
        "${text}"`;

      const response = await AI.ask(prompt, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: options.model ? (options.model as any) : undefined,
        creativity: options.creativity || 0.7,
      });

      if (!response || response.trim().length === 0) {
        throw new Error("AI response is empty");
      }

      let flashcards: Flashcard[] = [];
      let jsonString = response.trim();

      // Try different approaches to extract JSON
      if (!jsonString.startsWith("[") || !jsonString.endsWith("]")) {
        // Try to find JSON array with regex
        const jsonMatch = response.match(/(\[[\s\S]+?\])/);
        if (jsonMatch && jsonMatch[1]) {
          jsonString = jsonMatch[1].trim();
        } else {
          // Try to find JSON array with brackets
          const firstBracket = response.indexOf("[");
          const lastBracket = response.lastIndexOf("]");
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonString = response.substring(firstBracket, lastBracket + 1);
          } else {
            throw new Error("Invalid JSON response from AI: No valid JSON array found. Full response: " + response);
          }
        }
      }

      try {
        // Remove any markdown code block markers
        jsonString = jsonString.replace(/```json|```/g, "").trim();

        // Validate JSON structure before parsing
        if (!/^\s*(\[|\{)/.test(jsonString)) {
          throw new Error("Invalid JSON: Must start with array or object");
        }

        // Parse with additional validation
        flashcards = JSON.parse(jsonString);

        // Validate parsed flashcards structure
        if (!Array.isArray(flashcards)) {
          throw new Error("Expected array of flashcards");
        }

        flashcards.forEach((card, index) => {
          if (!card || typeof card !== "object") {
            throw new Error(`Invalid flashcard at index ${index}: Must be an object`);
          }
          if (!card.front || !card.back) {
            throw new Error(`Invalid flashcard at index ${index}: Missing required fields`);
          }
        });
      } catch (err) {
        console.error("Failed to parse flashcard JSON:", {
          error: err,
          jsonString: jsonString,
        });
        throw new Error(`Failed to parse flashcard data: ${err.message}`);
      }

      // Add difficulty level to each flashcard and ensure all required fields exist
      return flashcards
        .filter((card) => card && typeof card.front === "string" && typeof card.back === "string")
        .map((card) => ({
          front: String(card.front).trim(),
          back: String(card.back).trim(),
          extra: card.extra ? String(card.extra).trim() : "",
          tags: Array.isArray(card.tags) ? card.tags.filter((tag) => typeof tag === "string").slice(0, 2) : [],
          difficulty: options.difficultyLevel || "intermediate",
        }))
        .slice(0, options.maxFlashcards || 5);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(NetworkHelper.formatErrorMessage(error));
      }
      throw error;
    }
  }
}
