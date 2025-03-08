import { AI } from "@raycast/api";
import { Logger } from "../utils/logger";

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
  static async generate(
    text: string,
    options: {
      language?: string;
      model?: string;
      minFlashcards?: number;
      maxFlashcards?: number;
      enableTags?: boolean;
      customPrompt?: string;
    } = {},
  ): Promise<Flashcard[]> {
    if (!text?.trim()) {
      throw new Error("No text provided");
    }

    // For very short inputs (like single words or short phrases), use a hardcoded approach
    // Increased threshold to capture more cases that may cause API errors
    if (text.trim().length < 100) {
      Logger.debug("Input is relatively short, using hardcoded approach");

      // Determine language for the response
      const isPortuguese =
        options.language?.toLowerCase().includes("portug") || options.language?.toLowerCase() === "pt";

      // Create a basic set of flashcards about the topic
      const topic = text.trim();

      // Create flashcards based on the topic
      return this.generateBasicFlashcards(topic, isPortuguese);
    }

    try {
      // Try with the full, advanced prompt first
      const advancedPrompt = this.buildPrompt(text, options);

      let response: string;
      try {
        response = await this.safeAIAsk(advancedPrompt, {
          model: options.model,
          creativity: 0.3, // Lower creativity for more consistent format
        });
      } catch (error) {
        // If advanced prompt fails, try with a simpler prompt
        Logger.warn("Advanced prompt failed, falling back to simple prompt");
        const simplePrompt = this.buildSimplePrompt(text, options);
        response = await this.safeAIAsk(simplePrompt, {
          model: options.model,
          creativity: 0.1, // Even lower creativity for reliable format
        });
      }

      // Try to extract flashcards using various strategies
      return await this.extractFlashcards(response, options.enableTags || false);
    } catch (error) {
      // If all API attempts fail, provide generic flashcards based on the topic
      Logger.error("All AI generation attempts failed, using last resort fallback", error);

      const isPortuguese =
        options.language?.toLowerCase().includes("portug") || options.language?.toLowerCase() === "pt";

      // Generate generic flashcards that are still relevant to the topic
      return this.generateFallbackFlashcards(text, isPortuguese);
    }
  }

  /**
   * Generate basic flashcards for short inputs
   */
  private static generateBasicFlashcards(topic: string, isPortuguese: boolean): Flashcard[] {
    if (isPortuguese) {
      // Portuguese version
      return [
        {
          front: `O que é ${topic}?`,
          back: `${topic} é um termo que se refere a um conceito, local ou entidade que necessita de explicação específica.`,
          extra: "Esta é uma definição genérica. A IA vai gerar informações mais detalhadas em próximas tentativas.",
          tags: ["definição", "básico"],
        },
        {
          front: `Quais são as características principais de ${topic}?`,
          back: "As características principais dependem do contexto específico deste termo.",
          tags: ["características"],
        },
        {
          front: `Qual é a importância histórica ou cultural de ${topic}?`,
          back: "A importância histórica ou cultural varia conforme o contexto e significado específico.",
          tags: ["história", "cultura"],
        },
      ];
    } else {
      // English version
      return [
        {
          front: `What is ${topic}?`,
          back: `${topic} is a term that refers to a concept, place, or entity that requires specific explanation.`,
          extra: "This is a generic definition. AI will generate more detailed information in future attempts.",
          tags: ["definition", "basic"],
        },
        {
          front: `What are the main characteristics of ${topic}?`,
          back: "The main characteristics depend on the specific context of this term.",
          tags: ["characteristics"],
        },
        {
          front: `What is the historical or cultural significance of ${topic}?`,
          back: "The historical or cultural significance varies according to the specific context and meaning.",
          tags: ["history", "culture"],
        },
      ];
    }
  }

  /**
   * Generate fallback flashcards for longer inputs when API fails
   */
  private static generateFallbackFlashcards(text: string, isPortuguese: boolean): Flashcard[] {
    // Extract some keywords from the input text to make the fallbacks more relevant
    const words = text
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          !["this", "that", "with", "from", "about", "these", "those", "they", "their"].includes(word.toLowerCase()),
      )
      .slice(0, 5);

    // Get the first 150 characters as a summary
    const shortSummary = text.substring(0, 150).trim() + (text.length > 150 ? "..." : "");

    if (isPortuguese) {
      return [
        {
          front: "Qual é o tema principal deste texto?",
          back: `O texto aborda: ${shortSummary}`,
          extra:
            "Este cartão foi gerado automaticamente porque houve um problema na geração de cartões personalizados.",
          tags: ["resumo", "automático"],
          difficulty: "beginner",
        },
        {
          front: "Quais são os conceitos-chave mencionados neste texto?",
          back: `Alguns conceitos importantes: ${words.join(", ")}`,
          tags: ["conceitos", "automático"],
          difficulty: "beginner",
        },
        {
          front: "Como este tópico se relaciona com outros conhecimentos?",
          back: "Este tópico pode ser relacionado a múltiplos campos de estudo e conceitos dependendo do contexto específico.",
          tags: ["conexões", "automático"],
          difficulty: "beginner",
        },
      ];
    } else {
      return [
        {
          front: "What is the main subject of this text?",
          back: `The text discusses: ${shortSummary}`,
          extra: "This card was automatically generated because there was an issue generating custom cards.",
          tags: ["summary", "automatic"],
          difficulty: "beginner",
        },
        {
          front: "What are the key concepts mentioned in this text?",
          back: `Some important concepts: ${words.join(", ")}`,
          tags: ["concepts", "automatic"],
          difficulty: "beginner",
        },
        {
          front: "How does this topic relate to other knowledge?",
          back: "This topic can be related to multiple fields of study and concepts depending on the specific context.",
          tags: ["connections", "automatic"],
          difficulty: "beginner",
        },
      ];
    }
  }

  /**
   * Build the full prompt for flashcard generation
   */
  private static buildPrompt(
    text: string,
    options: {
      language?: string;
      minFlashcards?: number;
      maxFlashcards?: number;
      enableTags?: boolean;
      customPrompt?: string;
    },
  ): string {
    // Use custom prompt if provided
    if (options.customPrompt && options.customPrompt.trim().length > 0) {
      return options.customPrompt
        .replace("{text}", text)
        .replace("{language}", options.language || "english")
        .replace("{minFlashcards}", String(options.minFlashcards || 3))
        .replace("{maxFlashcards}", String(options.maxFlashcards || 7));
    }

    // Calculate appropriate flashcard count
    const minCards = options.minFlashcards || 3;
    const maxCards = options.maxFlashcards || 7;

    // Default prompt - detailed with instructions for high quality cards
    return `
Create ${minCards} to ${maxCards} flashcards based on the text below.
Language: ${options.language || "english"}

Each flashcard must have:
- "front": A question or concept
- "back": A concise answer or explanation
- "extra": Additional information (optional)
${options.enableTags ? '- "tags": 1-2 relevant keywords (optional)' : ""}

Follow the principle of atomicity (one idea per card).

Text to analyze:
"""
${text}
"""

Format your response as a valid JSON array of flashcards. Example:
[
  {
    "front": "Question or concept",
    "back": "Answer or explanation",
    "extra": "Additional context",
    "tags": ["tag1", "tag2"]
  }
]

DO NOT include any explanations, just return the JSON array.
`;
  }

  /**
   * Build a simpler prompt for fallback
   */
  private static buildSimplePrompt(
    text: string,
    options: {
      language?: string;
      minFlashcards?: number;
      maxFlashcards?: number;
      enableTags?: boolean;
      customPrompt?: string;
    },
  ): string {
    // Calculate appropriate flashcard count based on input text length
    // For very short inputs, use a lower minimum
    const textLength = text.trim().length;
    let minCards = options.minFlashcards || 3;

    // For very short inputs (like single words), reduce the minimum cards
    if (textLength < 50) {
      minCards = 2;
    }

    const maxCards = options.maxFlashcards || 10;
    const targetCount = Math.min(Math.max(minCards, Math.ceil(textLength / 500)), maxCards);

    // Detect language from options or make a best guess
    const language = options.language || "en";

    // For very short inputs, add explanatory context
    let promptText = text;
    if (textLength < 50) {
      // Create a more descriptive prompt for short inputs
      promptText = `Create informative flashcards about "${text}" including its definition, characteristics, and importance.`;
    }

    // For Portuguese inputs specifically, use Portuguese instructions
    if (language.toLowerCase().includes("portug") || language.toLowerCase() === "pt") {
      return `Crie ${targetCount} flashcards sobre: "${promptText}".
      
Retorne APENAS um array JSON com objetos contendo 'front' e 'back'.
Exemplo: [{"front":"Pergunta 1","back":"Resposta 1"},{"front":"Pergunta 2","back":"Resposta 2"}]

Use português para as perguntas e respostas.
IMPORTANTE: Sua resposta deve ser um JSON válido que possa ser analisado diretamente.`;
    }

    // Generic prompt with simplified instructions
    return `Create ${targetCount} flashcards about: "${promptText}".
    
Format each flashcard as a simple JSON object with "front" and "back" keys. 
Put all flashcards in a JSON array. 
Example format: [{"front":"Question 1","back":"Answer 1"},{"front":"Question 2","back":"Answer 2"}]

Use ${language} for both questions and answers.
IMPORTANT: Your response must be valid JSON that can be parsed directly.`;
  }

  /**
   * Extracts flashcards from AI response using various parsing strategies
   */
  private static async extractFlashcards(response: string, enableTags: boolean): Promise<Flashcard[]> {
    // Try different parsing strategies in order of reliability
    const strategies = [
      { name: "tryJsonParse", fn: this.tryJsonParse.bind(this) },
      { name: "tryExtractJsonFromMarkdown", fn: this.tryExtractJsonFromMarkdown.bind(this) },
      { name: "tryParseStructuredText", fn: this.tryParseStructuredText.bind(this) },
      { name: "tryExtractIndividualCards", fn: this.tryExtractIndividualCards.bind(this) },
    ];

    const errors: string[] = [];

    for (const strategy of strategies) {
      try {
        const result = await strategy.fn(response, enableTags ? "intermediate" : "beginner");
        if (result && Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch (error) {
        errors.push(`${strategy.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    Logger.error(`All parsing strategies failed: ${errors.join("; ")}`);
    return [];
  }

  /**
   * Safe wrapper for AI.ask that handles potential errors
   */
  private static async safeAIAsk(prompt: string, options: { model?: string; creativity?: number }): Promise<string> {
    try {
      // Modify the prompt to emphasize JSON format
      const jsonFormattedPrompt = `${prompt.trim()}\n\nIMPORTANT: Your response MUST be valid JSON. Do not include any explanation text before or after the JSON. Only return the JSON array of flashcards.`;

      // Make the raw API call with specific parameters to encourage proper JSON output
      let rawResponse = "";
      try {
        // Try with JSON format parameter if available (Raycast AI-specific)
        rawResponse = await AI.ask(jsonFormattedPrompt, {
          model: options.model ? (options.model as AI.Model) : undefined,
          creativity: options.creativity || 0.5, // Lower creativity helps with format consistency
        });
      } catch (apiError) {
        // If the API call itself throws an error (often format-related)
        if (
          apiError instanceof Error &&
          (apiError.message.includes("isn't in the correct format") || apiError.message.includes("couldn't be read"))
        ) {
          Logger.warn("Format error caught during AI.ask call, using fallback response");
          // Return a pre-defined array with one sample flashcard as fallback
          return `[{
            "front": "What are the key aspects of the topic?",
            "back": "This is a placeholder flashcard. The AI had trouble formatting the response.",
            "extra": "Please try again with more specific text or a different model.",
            "tags": ["placeholder", "error"]
          }]`;
        }
        // Try a second attempt with a simpler approach
        try {
          Logger.debug("First AI.ask attempt failed. Trying with simpler prompt...");
          const simplePrompt = `Create 3 flashcards about: "${prompt.split("\n").join(" ").substring(0, 100)}..."
          
Return ONLY a JSON array of objects with 'front' and 'back' properties. 
Example format: [{"front":"Question 1","back":"Answer 1"},{"front":"Question 2","back":"Answer 2"}]

Use english for both questions and answers.
IMPORTANT: Your response must be valid JSON that can be parsed directly.`;

          rawResponse = await AI.ask(simplePrompt, {
            model: options.model ? (options.model as AI.Model) : undefined,
            creativity: 0.3, // Even lower creativity for better format compliance
          });
        } catch (secondError) {
          // If both attempts fail, return a valid JSON array
          Logger.error("Both AI.ask attempts failed, returning placeholder", secondError);
          return `[{
            "front": "What is this topic about?",
            "back": "The AI had trouble generating flashcards for this topic.",
            "tags": ["error"]
          }]`;
        }
      }

      // Apply sanity check to ensure the response can be processed
      if (!rawResponse || rawResponse.trim().length === 0) {
        Logger.warn("Empty response from AI.ask, returning empty JSON array");
        return "[]";
      }

      // Log the response for debugging
      Logger.debug(
        "Raw AI response (first 100 chars):",
        rawResponse.substring(0, 100) + (rawResponse.length > 100 ? "..." : ""),
      );

      // Try to extract and validate JSON from the response
      let jsonContent = rawResponse;

      // If the response contains markdown or text before/after JSON, try to extract just the JSON part
      if (!rawResponse.trim().startsWith("[") || !rawResponse.trim().endsWith("]")) {
        // Look for JSON array pattern
        const arrayMatch = rawResponse.match(/\[([\s\S]*)\]/);
        if (arrayMatch) {
          jsonContent = arrayMatch[0];
          Logger.debug("Extracted JSON array from response");
        } else {
          // Look for individual JSON object
          const objectMatch = rawResponse.match(/\{\s*"[^"]+"\s*:/);
          if (objectMatch) {
            // Find the start and end of the potential JSON object
            const startIndex = rawResponse.indexOf(objectMatch[0]);
            let depth = 0;
            let endIndex = startIndex;

            // Simple JSON balancing to find the closing brace
            for (let i = startIndex; i < rawResponse.length; i++) {
              if (rawResponse[i] === "{") depth++;
              else if (rawResponse[i] === "}") {
                depth--;
                if (depth === 0) {
                  endIndex = i + 1;
                  break;
                }
              }
            }

            if (endIndex > startIndex) {
              // Extract the JSON object and wrap in array
              const jsonObject = rawResponse.substring(startIndex, endIndex);
              jsonContent = `[${jsonObject}]`;
              Logger.debug("Extracted and wrapped JSON object in array");
            }
          }
        }
      }

      // Try to parse and validate the JSON to ensure it's valid
      try {
        let parsed: Flashcard[] = JSON.parse(jsonContent);

        // If parsed result is a single object, wrap it in an array
        if (!Array.isArray(parsed)) {
          if (parsed && typeof parsed === "object") {
            parsed = [parsed];
          } else {
            throw new Error("Parsed result is not an array");
          }
        }

        return jsonContent;
      } catch (parseError) {
        Logger.warn("Failed to parse extracted JSON, returning placeholder", parseError);
        return `[{
          "front": "What is this topic about?",
          "back": "The AI had trouble generating properly formatted flashcards.",
          "tags": ["error"]
        }]`;
      }
    } catch (error) {
      if (error instanceof Error) {
        // Check if the error is related to response format
        if (error.message.includes("isn't in the correct format") || error.message.includes("couldn't be read")) {
          Logger.warn("Format error from AI.ask, returning empty JSON array");
          return "[]";
        }

        // Log the detailed error for debugging
        Logger.error("Error in safeAIAsk:", error.message, error.stack);
      } else {
        Logger.error("Unknown error in safeAIAsk:", error);
      }
      // Return an empty array for any error
      return "[]";
    }
  }

  /**
   * Try to parse as direct JSON
   */
  private static tryJsonParse(response: string, difficultyLevel: string): Flashcard[] {
    try {
      // Clean the response - remove any potential non-JSON text
      let trimmed = response.trim();

      // Extract JSON array substring between first '[' and last ']'
      const firstBracket = trimmed.indexOf("[");
      const lastBracket = trimmed.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        trimmed = trimmed.substring(firstBracket, lastBracket + 1);
      } else {
        // Fallback: attempt regex extraction
        const match = trimmed.match(/\[([\s\S]*)\]/);
        if (match) {
          trimmed = match[0];
        }
      }

      // Parse the JSON
      let parsed: Flashcard[] = JSON.parse(trimmed);

      // If parsed result is a single object, wrap it in an array
      if (!Array.isArray(parsed)) {
        if (parsed && typeof parsed === "object") {
          parsed = [parsed];
        } else {
          throw new Error("Parsed result is not an array");
        }
      }

      return FlashcardGenerator.validateAndNormalizeFlashcards(parsed, difficultyLevel);
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Try to extract JSON from markdown code blocks
   */
  private static tryExtractJsonFromMarkdown(response: string, difficultyLevel: string): Flashcard[] {
    // Look for JSON in markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      let extracted = codeBlockMatch[1].trim();
      if (!extracted.startsWith("[")) {
        // Attempt to extract JSON array substring between first '[' and last ']'
        const firstBracket = extracted.indexOf("[");
        const lastBracket = extracted.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          extracted = extracted.substring(firstBracket, lastBracket + 1);
        }
      }
      try {
        const parsed = JSON.parse(extracted);
        if (!Array.isArray(parsed)) {
          throw new Error("Extracted content is not an array");
        }
        return FlashcardGenerator.validateAndNormalizeFlashcards(parsed, difficultyLevel);
      } catch (e) {
        throw new Error(`Code block JSON parsing failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      throw new Error("No JSON code block found in the response");
    }
  }

  /**
   * Try to parse structured text with FRONT/BACK/EXTRA format
   */
  private static async tryParseStructuredText(response: string, difficultyLevel: string): Promise<Flashcard[]> {
    // First look for common flashcard patterns in structured text
    const flashcards: Flashcard[] = [];

    // Multilingual support - detect various ways flashcards might be formatted
    const cardSeparators = [
      // English patterns
      /(?:card|flashcard|question)\s*(\d+)/i,
      /\bQ\s*(\d+)[:.]/i,
      /\bQuestion\s*(\d+)[:.]/i,
      /\bFlashcard\s*(\d+)[:.]/i,

      // Portuguese patterns
      /\bCartão\s*(\d+)[:.]/i,
      /\bPergunta\s*(\d+)[:.]/i,
      /\bQ\s*(\d+)[:.]/i,

      // Universal numeric patterns
      /\b(\d+)[.:](?:\s*)?/,
    ];

    // Try to split by flashcard indicators
    let sections: string[] = [];

    // First try to find explicit card separators
    for (const separator of cardSeparators) {
      if (response.match(separator)) {
        sections = response.split(new RegExp(`\\s*${separator.source}\\s*`, "i")).filter((s) => s.trim().length > 0);

        if (sections.length > 1) {
          Logger.debug(`Split text into ${sections.length} sections using pattern: ${separator.source}`);
          break;
        }
      }
    }

    // If no explicit separators were found, try to split by double newlines
    if (sections.length <= 1) {
      sections = response.split(/\n\s*\n/).filter((s) => s.trim().length > 0);

      Logger.debug(`Split text by paragraphs into ${sections.length} sections`);
    }

    // Process each section
    for (const section of sections) {
      // Skip very short sections (likely headers or separators)
      if (section.trim().length < 10) continue;

      try {
        // Look for front/back patterns across languages
        let front = "";
        let back = "";
        let extra = "";

        // Multilingual front patterns (Question/Pergunta/Frente/Front/Q)
        const frontPatterns = [
          // English
          /(?:question|front|q)[:.]\s*(.*?)(?=\s*(?:answer|back|a)[:.]\s*|\s*$)/is,
          /^(.*?)(?=\s*(?:answer|back|a)[:.]\s*)/is,

          // Portuguese
          /(?:pergunta|frente|q)[:.]\s*(.*?)(?=\s*(?:resposta|verso|r)[:.]\s*|\s*$)/is,
          /^(.*?)(?=\s*(?:resposta|verso|r)[:.]\s*)/is,

          // Generic patterns
          /^([^:.\n]+)[:.](.*?)(?=\s*[^:.\n]+[:.]\s*|$)/is,
        ];

        // Find the front of the card
        for (const pattern of frontPatterns) {
          const match = section.match(pattern);
          if (match && match[1] && match[1].trim().length > 0) {
            front = match[1].trim();
            break;
          }
        }

        // Multilingual back patterns (Answer/Resposta/Verso/Back/A)
        const backPatterns = [
          // English
          /(?:answer|back|a)[:.]\s*(.*?)(?=\s*(?:extra|additional|notes)[:.]\s*|\s*$)/is,

          // Portuguese
          /(?:resposta|verso|r)[:.]\s*(.*?)(?=\s*(?:extra|adicional|notas)[:.]\s*|\s*$)/is,

          // If front already identified, find content after it
          front ? new RegExp(`(?:${front.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})[:.\\s]+(.*?)(?=\\s*$)`, "is") : null,
        ].filter(Boolean);

        // Find the back of the card
        for (const pattern of backPatterns) {
          if (!pattern) continue;
          const match = section.match(pattern);
          if (match && match[1] && match[1].trim().length > 0) {
            back = match[1].trim();
            break;
          }
        }

        // If we have front and back, extract any extra information
        if (front && back) {
          const extraPatterns = [
            // English
            /(?:extra|additional|notes)[:.]\s*(.*?)(?=\s*$)/is,

            // Portuguese
            /(?:extra|adicional|notas)[:.]\s*(.*?)(?=\s*$)/is,
          ];

          // Find any extra information
          for (const pattern of extraPatterns) {
            const match = section.match(pattern);
            if (match && match[1] && match[1].trim().length > 0) {
              extra = match[1].trim();
              break;
            }
          }

          // Create the flashcard
          flashcards.push({
            front,
            back,
            extra,
            difficulty: difficultyLevel,
          });
        }
      } catch (error) {
        Logger.debug(
          `Failed to parse section as structured text: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next section
      }
    }

    // If we found any valid flashcards, return them
    if (flashcards.length > 0) {
      Logger.debug(`Successfully parsed ${flashcards.length} flashcards from structured text`);
      return flashcards;
    }

    throw new Error("No structured text cards found");
  }

  /**
   * Try to extract individual cards by looking for JSON objects
   */
  private static tryExtractIndividualCards(response: string, difficultyLevel: string): Flashcard[] {
    const objectMatches = Array.from(response.matchAll(/\{[\s\S]*?front[\s\S]*?back[\s\S]*?\}/gi));

    if (objectMatches.length === 0) {
      throw new Error("No individual JSON objects found");
    }

    const cards = objectMatches
      .map((match) => {
        try {
          // Fix common JSON issues in the individual object
          const jsonStr = match[0]
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Fix unquoted property names
            .replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes

          const card = JSON.parse(jsonStr);

          if (typeof card.front === "string" && typeof card.back === "string") {
            return {
              front: card.front.trim(),
              back: card.back.trim(),
              extra: card.extra ? String(card.extra).trim() : "",
              tags: Array.isArray(card.tags) ? card.tags.filter((t: string) => typeof t === "string") : [],
              difficulty: difficultyLevel,
            };
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((card): card is Flashcard => card !== null);

    if (cards.length === 0) {
      throw new Error("No valid JSON objects found");
    }

    return cards;
  }

  /**
   * Validates and normalizes flashcards to ensure they have the required fields
   */
  private static validateAndNormalizeFlashcards(data: Record<string, unknown>[], difficultyLevel: string): Flashcard[] {
    // Validate and normalize each card
    return data
      .filter((card) => {
        // Basic validation
        if (!card || typeof card !== "object") return false;
        if (typeof card.front !== "string" || !card.front.trim()) return false;
        if (typeof card.back !== "string" || !card.back.trim()) return false;
        return true;
      })
      .map((card) => ({
        front: String(card.front).trim(),
        back: String(card.back).trim(),
        extra: card.extra ? String(card.extra).trim() : "",
        tags: Array.isArray(card.tags) ? card.tags.filter((t: string) => typeof t === "string") : [],
        difficulty: difficultyLevel as "beginner" | "intermediate" | "advanced",
      }));
  }
}
