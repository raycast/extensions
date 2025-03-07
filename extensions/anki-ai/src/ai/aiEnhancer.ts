import { AI } from "@raycast/api";
import { Flashcard } from "./flashcardGenerator";
import { Logger } from "../utils/logger";
import { getAIModelIdentifier } from "../constants/aiModels";

export class AIEnhancer {
  static async enhanceFlashcard(
    flashcard: Flashcard,
    options?: {
      model?: string;
      creativity?: number;
    },
  ): Promise<Flashcard> {
    try {
      const language = options?.language || "english";
      const prompt = `Improve this flashcard by adding practical examples, additional relevant information, and mnemonics to facilitate memorization.
      
      Current flashcard:
      Front: ${flashcard.front}
      Back: ${flashcard.back}
      Extra: ${flashcard.extra || ""}
      Difficulty: ${flashcard.difficulty || "intermediate"}
      
      Specific instructions:
      1. Keep the original question (front)
      2. Expand the answer (back) to make it more detailed and complete, but still concise
      3. In the "extra" field, add:
         - 2-3 concrete and applicable examples
         - Additional explanations that complement the main concept
         - Specific mnemonics or memorization techniques
         - Connections with other related concepts
         - Tips for practical application of the knowledge
      4. Keep the content organized with clear headings and formatting
      5. Answer in ${language}
      6. Maintain consistency with the "${flashcard.difficulty || "intermediate"}" difficulty level
      
      Return the JSON of the improved flashcard in the following format:
      {
        "front": "The original question",
        "back": "The expanded and more detailed answer",
        "extra": "Enriched content with examples, mnemonics, and additional information",
        "difficulty": "${flashcard.difficulty || "intermediate"}"
      }`;

      // Determine the model to use
      let aiModel = undefined;
      if (options?.model) {
        // First try to use the custom mapping
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Model may not be in the type definition
            aiModel = modelId;
            Logger.debug(`Using AI model with custom mapping: ${options.model} (${aiModel})`);
          } catch (err) {
            Logger.warn(`Model not recognized by custom mapping: ${options.model}, trying fallback to AI.Model`);
          }
        }

        // Fallback to the old method if custom mapping fails
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
          Logger.debug(`Using AI model with AI.Model: ${options.model} (${aiModel})`);
        }

        if (!aiModel) {
          Logger.warn(`AI model not recognized: ${options.model}, using default GPT-4o model`);
          // @ts-expect-error - Default model may not exist in the type AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Default model may not exist in the type AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: options?.creativity || 0.7,
      });

      const enhancedCard = this.parseResponse(response);

      // Ensure the original flashcard is preserved if AI doesn't return valid fields
      return {
        front: enhancedCard.front || flashcard.front,
        back: enhancedCard.back || flashcard.back,
        extra: enhancedCard.extra || flashcard.extra,
        tags: flashcard.tags, // Preserve original tags
        difficulty: enhancedCard.difficulty || flashcard.difficulty || "intermediate",
      };
    } catch (error) {
      Logger.error("Error enhancing flashcard", error);
      return flashcard; // Return original flashcard on error
    }
  }

  static async generateExamples(
    concept: string,
    count: number = 3,
    options?: { model?: string; language?: string },
  ): Promise<string[]> {
    try {
      const language = options?.language || "english";
      const prompt = `Generate ${count} practical, concrete, and applicable examples to explain the concept: "${concept}"
      
      Instructions:
      1. Examples should be concise (maximum 2-3 sentences each)
      2. They should illustrate practical applications of the concept
      3. They should be diverse, covering different aspects
      4. Answer in ${language}
      
      Return only a JSON array with the examples, in the format:
      ["Example 1", "Example 2", "Example 3"]`;

      // Determine the model to use
      let aiModel = undefined;
      if (options?.model) {
        // First try to use the custom mapping
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Model may not be in the type definition
            aiModel = modelId;
          } catch (err) {
            Logger.warn(`Model not recognized by custom mapping: ${options.model}, trying fallback to AI.Model`);
          }
        }

        // Fallback to the old method if custom mapping fails
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`AI model not recognized: ${options.model}, using default GPT-4o model`);
          // @ts-expect-error - Default model may not exist in the type AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Default model may not exist in the type AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.8,
      });

      try {
        // Try to extract a JSON array from the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // If no JSON array found, try to clean the response
        const cleanedResponse = response.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        Logger.error("Error processing examples", parseError);

        // Fallback: extract lines that start with numbers or hyphens as examples
        const lines = response
          .split("\n")
          .filter((line) => line.trim().match(/^(\d+[.):]|[-•*])\s+.+/))
          .map((line) => line.replace(/^(\d+[.):]|[-•*])\s+/, "").trim());

        return lines.length > 0 ? lines : [];
      }
    } catch (error) {
      Logger.error("Error generating examples", error);
      return [];
    }
  }

  static async evaluateFlashcard(
    flashcard: Flashcard,
    options?: { model?: string; language?: string },
  ): Promise<{ score: number; suggestions: string[] }> {
    try {
      const language = options?.language || "english";
      const prompt = `Evaluate the quality of this flashcard and suggest specific improvements.
      
      Flashcard:
      Front: ${flashcard.front}
      Back: ${flashcard.back}
      Extra: ${flashcard.extra || ""}
      
      Return a JSON with:
      - score: number from 0 to 10
      - suggestions: array of improvement suggestions (in ${language})
      
      Evaluate based on:
      1. Question clarity (is it specific and unambiguous?)
      2. Answer accuracy (is it correct and complete?)
      3. Extra information usefulness (does it help understanding?)
      4. Atomicity (does it focus on a single idea per card?)
      5. Applicability (does it have practical examples?)
      6. Memorability (does it use techniques that facilitate memorization?)`;

      // Determine the model to use
      let aiModel = undefined;
      if (options?.model) {
        // First try to use the custom mapping
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Model may not be in the type definition
            aiModel = modelId;
          } catch (err) {
            Logger.warn(`Model not recognized by custom mapping: ${options.model}, trying fallback to AI.Model`);
          }
        }

        // Fallback to the old method if custom mapping fails
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`AI model not recognized: ${options.model}, using default GPT-4o model`);
          // @ts-expect-error - Default model may not exist in the type AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Default model may not exist in the type AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.5,
      });

      try {
        // Try to extract a JSON object from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            score: typeof result.score === "number" ? result.score : 0,
            suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
          };
        }

        // If no JSON object found, return default values
        return { score: 0, suggestions: ["Could not evaluate the flashcard."] };
      } catch (parseError) {
        Logger.error("Error processing evaluation", parseError);
        return { score: 0, suggestions: [] };
      }
    } catch (error) {
      Logger.error("Error evaluating flashcard", error);
      return { score: 0, suggestions: [] };
    }
  }

  static async generateRelatedQuestions(
    topic: string,
    count: number = 5,
    options?: { model?: string; language?: string },
  ): Promise<{ question: string; answer: string }[]> {
    try {
      const language = options?.language || "english";
      const prompt = `Generate ${count} questions related to the topic: "${topic}"
      
      Instructions:
      1. Each question should explore a different aspect of the topic
      2. Questions should be clear, specific, and unambiguous
      3. Answers should be concise but complete
      4. Include both factual and conceptual questions
      5. Answer in ${language}
      
      Return a JSON array of objects with "question" and "answer", in the format:
      [
        {"question": "Question 1?", "answer": "Answer 1"},
        {"question": "Question 2?", "answer": "Answer 2"}
      ]`;

      // Determine the model to use
      let aiModel = undefined;
      if (options?.model) {
        // First try to use the custom mapping
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Model may not be in the type definition
            aiModel = modelId;
          } catch (err) {
            Logger.warn(`Model not recognized by custom mapping: ${options.model}, trying fallback to AI.Model`);
          }
        }

        // Fallback to the old method if custom mapping fails
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`AI model not recognized: ${options.model}, using default GPT-4o model`);
          // @ts-expect-error - Default model may not exist in the type AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Default model may not exist in the type AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.9,
      });

      try {
        // Try to extract a JSON array from the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // If no JSON array found, try to clean the response
        const cleanedResponse = response.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        Logger.error("Error processing related questions", parseError);
        return [];
      }
    } catch (error) {
      Logger.error("Error generating related questions", error);
      return [];
    }
  }

  static async suggestTags(flashcard: Flashcard, options?: { model?: string; language?: string }): Promise<string[]> {
    try {
      const language = options?.language || "english";
      const prompt = `Suggest relevant tags for this flashcard:
      
      Flashcard:
      Front: ${flashcard.front}
      Back: ${flashcard.back}
      Extra: ${flashcard.extra || ""}
      
      Instructions:
      1. Generate 3-5 relevant tags based on the content
      2. Tags should be specific keywords or categories
      3. Use simple nouns, preferably singular
      4. Avoid tags that are too generic or too specific
      5. Tags should be in ${language}
      
      Return only a JSON array with the suggested tags.`;

      // Determine the model to use
      let aiModel = undefined;
      if (options?.model) {
        // First try to use the custom mapping
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Model may not be in the type definition
            aiModel = modelId;
          } catch (err) {
            Logger.warn(`Model not recognized by custom mapping: ${options.model}, trying fallback to AI.Model`);
          }
        }

        // Fallback to the old method if custom mapping fails
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`AI model not recognized: ${options.model}, using default GPT-4o model`);
          // @ts-expect-error - Default model may not exist in the type AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Default model may not exist in the type AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.3,
      });

      try {
        // Try to extract a JSON array from the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // If no JSON array found, try to clean the response
        const cleanedResponse = response.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        Logger.error("Error processing suggested tags", parseError);

        // Fallback: extract words that look like tags
        const tagPattern = /(#\w+|\b\w+\b)/g;
        const possibleTags = response.match(tagPattern) || [];
        return possibleTags
          .map((tag) => tag.replace("#", "").trim())
          .filter((tag) => tag.length > 2 && !/^\d+$/.test(tag));
      }
    } catch (error) {
      Logger.error("Error suggesting tags", error);
      return [];
    }
  }

  private static parseResponse(response: string): Flashcard {
    try {
      // Try to find a JSON object in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/s);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      // Clean the text of Markdown markings before parsing
      const cleanedJson = jsonString.replace(/```json|```/g, "").trim();

      const result = JSON.parse(cleanedJson);

      // Validate if the necessary fields are present
      if (!result.front && !result.back && !result.extra) {
        throw new Error("Invalid JSON: missing required fields");
      }

      // Validate the difficulty field
      if (result.difficulty && !["beginner", "intermediate", "advanced"].includes(result.difficulty)) {
        result.difficulty = "intermediate"; // Default value if invalid
      }

      return result;
    } catch (error) {
      Logger.error("Error processing AI response", error);

      // Try to extract fields from unstructured text
      const frontMatch = response.match(/front["\s:]+([^"]+)/i);
      const backMatch = response.match(/back["\s:]+([^"]+)/i);
      const extraMatch = response.match(/extra["\s:]+([^"]+)/i);
      const difficultyMatch = response.match(/difficulty["\s:]+([^"]+)/i);

      return {
        front: frontMatch ? frontMatch[1].trim() : "",
        back: backMatch ? backMatch[1].trim() : "",
        extra: extraMatch ? extraMatch[1].trim() : "",
        difficulty:
          difficultyMatch && ["beginner", "intermediate", "advanced"].includes(difficultyMatch[1].trim())
            ? (difficultyMatch[1].trim() as "beginner" | "intermediate" | "advanced")
            : "intermediate",
      };
    }
  }
}
