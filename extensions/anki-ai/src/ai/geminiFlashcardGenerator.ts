import { GeminiService } from "./geminiService";
import { ApiKeyManager } from "../utils/apiKeyManager";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";
import { Flashcard } from "./flashcardGenerator";
import * as z from "zod"; // Add zod for schema validation

// Define a schema for validating flashcard data
const FlashcardSchema = z.object({
  front: z.string().min(1, "Front content is required"),
  back: z.string().min(1, "Back content is required"),
  extra: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  difficulty: z.string().optional(),
});

const FlashcardsArraySchema = z.array(FlashcardSchema);

// Define error types for better error handling
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public rawResponse?: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyError";
  }
}

export class GeminiFlashcardGenerator {
  // Available models
  static readonly AVAILABLE_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

  // Maximum number of retries for API calls
  private static readonly MAX_RETRIES = 3;

  /**
   * Generate flashcards from text using Gemini API
   *
   * @param text The text to generate flashcards from
   * @param options Optional configuration for generation
   * @returns Array of generated flashcards
   */
  static async generate(
    text: string,
    options?: {
      model?: string;
      language?: string;
      maxCards?: number;
      temperature?: number;
      retries?: number;
    },
  ): Promise<Flashcard[]> {
    const model = options?.model || "gemini-1.5-flash";
    const language = options?.language || "português";
    const maxCards = options?.maxCards || 10;
    const temperature = options?.temperature || 0.7;
    const maxRetries = options?.retries || this.MAX_RETRIES;

    Logger.info(`Generating flashcards with Gemini model: ${model}`);
    Logger.debug("Generation options", { model, language, maxCards, temperature });

    try {
      // Validate the model
      if (!this.AVAILABLE_MODELS.includes(model)) {
        throw new Error(`Invalid model: ${model}. Available models: ${this.AVAILABLE_MODELS.join(", ")}`);
      }

      // Get API key
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        throw new ApiKeyError("Gemini API key not configured. Please set up your API key in settings.");
      }

      // Create Gemini service instance
      const geminiService = new GeminiService(apiKey, model);

      // Build prompt and make request with retries
      const prompt = this.buildPrompt(text, language, maxCards);

      // Implement exponential backoff retry logic
      let lastError: Error | null = null;
      let response: string | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          Logger.debug(`API request attempt ${attempt + 1}/${maxRetries}`);

          // Set temperature based on retry attempt (reduce randomness on retries)
          const adjustedTemperature = temperature * Math.pow(0.8, attempt);

          response = await geminiService.ask(prompt, { temperature: adjustedTemperature });
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          Logger.warn(`Attempt ${attempt + 1} failed: ${lastError.message}`);

          // Check if we should retry based on error type
          if (this.isRetryableError(lastError) && attempt < maxRetries - 1) {
            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
            Logger.debug(`Retrying in ${Math.round(delay)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // Non-retryable error or max retries reached
            throw lastError;
          }
        }
      }

      if (!response) {
        throw lastError || new Error("Failed to get response from Gemini API after multiple attempts");
      }

      Logger.debug("Gemini API response received", { responseLength: response.length });

      // Parse and validate the response
      const flashcards = await this.parseResponse(response);
      Logger.info(`Successfully generated ${flashcards.length} flashcards`);

      return flashcards;
    } catch (error) {
      // Handle specific error types
      if (error instanceof ApiKeyError) {
        ErrorHandler.handle(error, "API Key Error");
      } else if (error instanceof GeminiApiError) {
        ErrorHandler.handle(error, `Gemini API Error (${error.statusCode})`);
      } else if (error instanceof ParseError) {
        ErrorHandler.handle(error, "Failed to parse Gemini response");
        Logger.debug("Raw response that failed parsing:", error.rawResponse);
      } else {
        ErrorHandler.handleAIError(error);
      }

      return [];
    }
  }

  /**
   * Build a prompt for the Gemini API with clear instructions for JSON output
   */
  private static buildPrompt(text: string, language: string, maxCards: number): string {
    return `Generate up to ${maxCards} flashcards from the following text. 
    
Each flashcard should follow the principle of atomicity (one idea per card).

Return ONLY a valid JSON array with objects having these fields:
- "front": A question or concept (required)
- "back": A concise answer or explanation (required)
- "extra": Additional information, examples, or context (optional)

Example of the expected JSON format:
[
  {
    "front": "What is photosynthesis?",
    "back": "The process by which green plants and some other organisms use sunlight to synthesize foods with carbon dioxide and water.",
    "extra": "Occurs in chloroplasts, especially in the leaves. Produces oxygen as a byproduct."
  },
  {
    "front": "What are the primary reactants in photosynthesis?",
    "back": "Carbon dioxide (CO2) and water (H2O)",
    "extra": "Sunlight provides the energy for this reaction."
  }
]

Language: ${language}

Text:
"${text}"

Return ONLY the JSON array with no additional text, explanations, or markdown formatting.`;
  }

  /**
   * Parse and validate the response from Gemini API
   */
  private static async parseResponse(response: string): Promise<Flashcard[]> {
    try {
      // Clean up the response to extract just the JSON
      let jsonString = response.trim();

      // Remove markdown code block formatting if present
      jsonString = jsonString.replace(/^```json\s+/m, "").replace(/\s+```$/m, "");

      // Try to extract JSON array if there's additional text
      const jsonMatch = jsonString.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      // Parse the JSON
      let parsedData;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (jsonError) {
        throw new ParseError(
          `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
          response,
        );
      }

      // Validate the parsed data against our schema
      const validationResult = FlashcardsArraySchema.safeParse(parsedData);

      if (!validationResult.success) {
        // Log validation errors
        Logger.error("Schema validation failed", validationResult.error);

        // Attempt to salvage partial data if possible
        if (Array.isArray(parsedData)) {
          // Filter and fix cards that have the minimum required fields
          const salvaged = parsedData
            .filter((card) => card && typeof card.front === "string" && typeof card.back === "string")
            .map((card) => ({
              front: String(card.front).trim(),
              back: String(card.back).trim(),
              extra: card.extra ? String(card.extra).trim() : "",
              tags: Array.isArray(card.tags) ? card.tags.filter((tag) => typeof tag === "string") : [],
              difficulty: card.difficulty ? String(card.difficulty) : undefined,
            }));

          if (salvaged.length > 0) {
            Logger.warn(`Salvaged ${salvaged.length} flashcards from invalid response`);
            return salvaged;
          }
        }

        throw new ParseError("Response data failed validation", response);
      }

      // Return the validated flashcards
      return validationResult.data;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `Error processing response: ${error instanceof Error ? error.message : String(error)}`,
        response,
      );
    }
  }

  /**
   * Determine if an error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    // Network-related errors are retryable
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("econnreset") ||
      errorMessage.includes("socket")
    ) {
      return true;
    }

    // Rate limiting errors are retryable
    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("429")
    ) {
      return true;
    }

    // Server errors are retryable
    if (errorMessage.includes("server error") || errorMessage.includes("500") || errorMessage.includes("503")) {
      return true;
    }

    return false;
  }

  /**
   * Test connection to the Gemini API
   */
  static async testConnection(model = "gemini-1.5-flash"): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }> {
    try {
      // Check if API key is configured
      const apiKey = await ApiKeyManager.getGeminiApiKey();
      if (!apiKey) {
        return {
          success: false,
          message: "Gemini API key not configured. Please set up your API key in settings.",
          details: { missingApiKey: true },
        };
      }

      // Validate the model
      if (!this.AVAILABLE_MODELS.includes(model)) {
        return {
          success: false,
          message: `Invalid model: ${model}. Available models: ${this.AVAILABLE_MODELS.join(", ")}`,
          details: { invalidModel: true, availableModels: this.AVAILABLE_MODELS },
        };
      }

      // Create service and test with a simple prompt
      const geminiService = new GeminiService(apiKey, model);
      const testPrompt = "Return only the text 'CONNECTION_OK' without any additional text.";

      const response = await geminiService.ask(testPrompt, { temperature: 0.1 });

      // Check if the response contains the expected text
      const isValidResponse = response.includes("CONNECTION_OK");

      return {
        success: true,
        message: `Successfully connected to Gemini API using model: ${model}`,
        details: {
          model,
          validResponse: isValidResponse,
        },
      };
    } catch (error) {
      Logger.error("Error testing connection to Gemini", error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = "Failed to connect to Gemini API: ";

      if (errorMessage.includes("key") || errorMessage.includes("auth")) {
        userMessage += "Invalid API key or authentication error.";
      } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
        userMessage += "Network error. Please check your internet connection.";
      } else if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
        userMessage += "API quota exceeded. Please try again later.";
      } else {
        userMessage += errorMessage;
      }

      return {
        success: false,
        message: userMessage,
        details: { error: errorMessage },
      };
    }
  }
}
