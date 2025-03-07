import { AI, getPreferenceValues } from "@raycast/api";
import { Logger } from "../utils/logger";
import { getAIModelIdentifier } from "../constants/aiModels";

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
}

/**
 * Interface for extension preferences
 */
interface Preferences {
  defaultLanguage: string;
  defaultModel: string;
  defaultDifficultyLevel: string;
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
  static async generate(text: string, options?: FlashcardGenerationOptions): Promise<Flashcard[]> {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const language = options?.language || preferences.defaultLanguage || "english";
      const numCards = options?.numCards || 5;
      const difficultyLevel = options?.difficultyLevel || preferences.defaultDifficultyLevel || "intermediate";
      const enableTags = options?.enableTags !== undefined ? options.enableTags : true;
      const customPrompt = options?.customPrompt || "";

      Logger.debug(
        `Generating flashcards with Raycast AI. Model: ${options?.model || preferences.defaultModel || "default"}, Language: ${language}, Difficulty: ${difficultyLevel}, Number of cards: ${numCards}, Tags enabled: ${enableTags}`,
      );

      // Build the prompt for the AI
      const prompt = this.buildPrompt({
        text,
        language,
        numCards,
        difficultyLevel,
        enableTags,
        customPrompt,
      });

      // Use Raycast's built-in AI.ask function with model options if provided
      let aiModel: string | undefined;
      if (options?.model || preferences.defaultModel) {
        try {
          const modelName = options?.model || preferences.defaultModel;

          // First try to use the custom mapping
          const modelId = getAIModelIdentifier(modelName);
          if (modelId) {
            try {
              // @ts-expect-error - Ignoring type error as models may not all be in the type definition
              aiModel = modelId;
              Logger.debug(`Using AI model with custom mapping: ${modelName} (${aiModel})`);
            } catch (err) {
              Logger.warn(`Model not recognized by custom mapping: ${modelName}, trying fallback to AI.Model`);
            }
          }

          // Fallback to the old method if custom mapping fails
          if (!aiModel && modelName in AI.Model) {
            aiModel = AI.Model[modelName as keyof typeof AI.Model];
            Logger.debug(`Using AI model with AI.Model: ${modelName} (${aiModel})`);
          }

          // If still no model, use the default GPT4o
          if (!aiModel) {
            Logger.warn(`AI model not recognized: ${modelName}, using default GPT4o model`);
            const defaultModelId = getAIModelIdentifier("GPT4o");
            if (defaultModelId) {
              aiModel = defaultModelId;
              Logger.debug(`Using default model: GPT4o (${aiModel})`);
            } else {
              // Last resort: use the first available model
              aiModel = "openai-gpt-4o"; // Reliable default model
              Logger.debug(`Using hardcoded model: openai-gpt-4o`);
            }
          }
        } catch (error) {
          Logger.warn(`Invalid AI model: ${options?.model || preferences.defaultModel}, using default GPT4o model`);
          aiModel = "openai-gpt-4o"; // Reliable default model
          Logger.debug(`Using hardcoded model after error: openai-gpt-4o`);
        }
      }

      try {
        const response = await AI.ask(prompt, {
          model: aiModel,
          creativity: 1, // Medium creativity level
        });

        if (!response || response.trim().length === 0) {
          throw new Error("AI response is empty");
        }

        // Process the response to extract flashcards
        const flashcards = this.parseResponse(response, difficultyLevel);

        // Validate the number of generated flashcards
        if (flashcards.length === 0) {
          throw new Error("No flashcards were generated. The AI response doesn't contain valid flashcards.");
        }

        if (flashcards.length < numCards) {
          Logger.warn(`Only ${flashcards.length} flashcards were generated, less than the ${numCards} requested.`);
        }

        return flashcards;
      } catch (error) {
        Logger.error("Error when calling AI.ask:", error);
        throw error;
      }
    } catch (error) {
      Logger.error("Error generating flashcards:", error);
      throw error;
    }
  }

  private static buildPrompt(options: {
    text: string;
    language: string;
    numCards: number;
    difficultyLevel: string;
    enableTags?: boolean;
    customPrompt?: string;
  }): string {
    // Implementation to build the prompt for the AI
    // This implementation can be customized according to specific needs
    const { text, language, numCards, difficultyLevel, enableTags, customPrompt } = options;

    let prompt =
      customPrompt ||
      `Transform the following text into flashcards in JSON format with "front", "back", and "extra" fields. 
    The "front" field should contain a question or concept.
    The "back" field should contain a concise answer or explanation.
    The "extra" field should contain additional information, examples, or context that helps better understand the concept.
    Create flashcards that follow the principle of atomicity (one idea per card).
    Generate between 1 and ${numCards} flashcards.
    Return only the JSON array without additional explanations.
    Language: ${language}`;

    // Add difficulty level if specified
    if (difficultyLevel) {
      prompt += `
    Make sure the flashcards are at the ${difficultyLevel} difficulty level.`;
    }

    // Add instructions to generate tags if enabled
    if (enableTags) {
      prompt += `
    Add a "tags" field with a maximum of 2 relevant keywords for each flashcard.
    Tags should be short, specific terms that categorize the content.
    Avoid generic tags like "knowledge", "information", or "learning".`;
    }

    prompt += `
    
    Text:
    "${text}"`;

    return prompt;
  }

  private static parseResponse(response: string, difficultyLevel: string): Flashcard[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          const jsonArray = JSON.parse(jsonMatch[0]);
          if (Array.isArray(jsonArray)) {
            // Add difficulty level to each flashcard and limit tags
            return jsonArray.map((card) => {
              // Limit tags to a maximum of 2
              const limitedTags = card.tags && Array.isArray(card.tags) ? card.tags.slice(0, 2) : undefined;

              return {
                ...card,
                difficulty: difficultyLevel,
                tags: limitedTags,
              };
            });
          }
        } catch (e) {
          Logger.warn("Failed to parse JSON in response", e);
        }
      }

      // Fallback: try to extract manually if JSON is not found
      Logger.warn("Using fallback method to extract flashcards from response");
      const lines = response.split("\n");
      const flashcards: Flashcard[] = [];
      let currentCard: Partial<Flashcard> = {};

      for (const line of lines) {
        const frontMatch = line.match(/^(Q|Question|Front):\s*(.+)$/i);
        const backMatch = line.match(/^(A|Answer|Back):\s*(.+)$/i);
        const extraMatch = line.match(/^(Extra|Information|Info):\s*(.+)$/i);
        const tagsMatch = line.match(/^(Tags):\s*(.+)$/i);

        if (frontMatch) {
          // If we already have a card in progress, save it before starting a new one
          if (currentCard.front) {
            flashcards.push({
              front: currentCard.front,
              back: currentCard.back || "No answer",
              extra: currentCard.extra,
              tags: currentCard.tags ? currentCard.tags.slice(0, 2) : undefined,
              difficulty: difficultyLevel,
            });
          }
          // Start a new card
          currentCard = { front: frontMatch[2].trim() };
        } else if (backMatch && currentCard.front) {
          currentCard.back = backMatch[2].trim();
        } else if (extraMatch && currentCard.front) {
          currentCard.extra = extraMatch[2].trim();
        } else if (tagsMatch && currentCard.front) {
          // Limit tags to a maximum of 2
          currentCard.tags = tagsMatch[2]
            .split(/[,;]/)
            .map((tag) => tag.trim())
            .slice(0, 2);
        }
      }

      // Add the last card if there's one being processed
      if (currentCard.front) {
        flashcards.push({
          front: currentCard.front,
          back: currentCard.back || "No answer",
          extra: currentCard.extra,
          tags: currentCard.tags ? currentCard.tags.slice(0, 2) : undefined,
          difficulty: difficultyLevel,
        });
      }

      return flashcards;
    } catch (error) {
      Logger.error("Error processing AI response", error);
      throw error;
    }
  }
}
