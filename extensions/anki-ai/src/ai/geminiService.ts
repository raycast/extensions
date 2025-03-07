import fetch from "node-fetch";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";

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
}

export class GeminiService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.baseURL = "https://generativelanguage.googleapis.com/v1beta";
    this.model = model;
  }

  /**
   * Envia uma solicitação para o modelo Gemini
   */
  async chat(messages: GeminiMessage[]): Promise<string> {
    try {
      Logger.info(`Enviando solicitação para o modelo ${this.model}`);

      const endpoint = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;

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
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Gemini: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GeminiResponse;

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Resposta vazia da API Gemini");
      }

      const textResponse = data.candidates[0].content.parts[0].text;
      return textResponse;
    } catch (error) {
      ErrorHandler.handleAIError(error);
      throw error;
    }
  }

  /**
   * Método simplificado para enviar uma única mensagem
   */
  async ask(prompt: string): Promise<string> {
    const messages: GeminiMessage[] = [{ role: "user", content: prompt }];
    return this.chat(messages);
  }

  /**
   * Método para enviar uma mensagem com um sistema de instruções
   */
  async askWithSystem(systemPrompt: string, userPrompt: string): Promise<string> {
    const messages: GeminiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    return this.chat(messages);
  }
}
