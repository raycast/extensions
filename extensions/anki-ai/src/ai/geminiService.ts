import fetch from "node-fetch";
import { Logger } from "../utils/logger";

interface GeminiMessage {
  role: "user" | "system";
  content: string;
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

interface RequestOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  timeout?: number;
}

export class GeminiService {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private defaultOptions: RequestOptions;

  constructor(apiKey: string, model = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.baseURL = "https://generativelanguage.googleapis.com/v1beta";
    this.model = model;
    this.defaultOptions = {
      temperature: 0.7,
      maxOutputTokens: 2048,
      timeout: 30000, // 30 seconds default timeout
    };
  }

  /**
   * Send a request to the Gemini model
   */
  async chat(messages: GeminiMessage[], options?: RequestOptions): Promise<string> {
    const requestOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      Logger.info(`Sending request to Gemini model: ${this.model}`);
      Logger.debug("Request options", { model: this.model, ...requestOptions });

      const endpoint = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, requestOptions.timeout);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: messages.map((msg) => ({
              role: msg.role,
              parts: [{ text: msg.content }],
            })),
            generationConfig: {
              temperature: requestOptions.temperature,
              maxOutputTokens: requestOptions.maxOutputTokens,
              topK: requestOptions.topK,
              topP: requestOptions.topP,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
          const statusCode = response.status;
          let errorBody = "";

          try {
            errorBody = await response.text();
          } catch (e) {
            // Ignore error reading body
          }

          // Specific error handling based on status code
          if (statusCode === 400) {
            throw new Error(`Bad request: ${errorBody}`);
          } else if (statusCode === 401 || statusCode === 403) {
            throw new Error("Authentication error: Invalid API key or insufficient permissions");
          } else if (statusCode === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          } else if (statusCode >= 500) {
            throw new Error(`Gemini API server error (${statusCode}): ${errorBody}`);
          } else {
            throw new Error(`Gemini API error: ${statusCode} - ${errorBody}`);
          }
        }

        const data = (await response.json()) as GeminiResponse;

        // Check for content filtering/blocking
        if (data.promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
        }

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("Empty response from Gemini API");
        }

        const textResponse = data.candidates[0].content.parts[0].text;

        const duration = Date.now() - startTime;
        Logger.debug(`Gemini API request completed in ${duration}ms`);

        return textResponse;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error.name === "AbortError") {
        Logger.error(`Gemini API request timed out after ${duration}ms`);
        throw new Error(`Request timed out after ${requestOptions.timeout}ms`);
      }

      Logger.error(`Gemini API error after ${duration}ms:`, error);

      // Rethrow the error for the caller to handle
      throw error;
    }
  }

  /**
   * Simplified method to send a single message
   */
  async ask(prompt: string, options?: RequestOptions): Promise<string> {
    const messages: GeminiMessage[] = [{ role: "user", content: prompt }];
    return this.chat(messages, options);
  }

  /**
   * Method to send a message with a system instruction
   */
  async askWithSystem(systemPrompt: string, userPrompt: string, options?: RequestOptions): Promise<string> {
    const messages: GeminiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    return this.chat(messages, options);
  }

  /**
   * Change the model being used
   */
  setModel(model: string): void {
    this.model = model;
    Logger.debug(`Gemini model changed to: ${model}`);
  }

  /**
   * Get the current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set default options for all requests
   */
  setDefaultOptions(options: RequestOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    Logger.debug("Updated default Gemini API options", this.defaultOptions);
  }
}
