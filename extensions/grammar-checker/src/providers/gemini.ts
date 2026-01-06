import { CheckResult, LLMProvider, ProviderConfig } from "../api";
import { getSystemPrompt } from "../styles";

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || "";
    this.model = config.model || "gemini-2.0-flash-exp";
  }

  async analyzeText(text: string, style: string): Promise<CheckResult> {
    if (!this.apiKey) {
      throw new Error("API Key is required.");
    }

    const systemPrompt = getSystemPrompt(style);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nTEXT TO ANALYZE:\n" + text }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              corrected: {
                type: "string",
                description: "The corrected text",
              },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      description:
                        "Type of issue: grammar, spelling, punctuation, or style",
                    },
                    severity: {
                      type: "string",
                      description: "Severity: error, warning, or suggestion",
                    },
                    original: {
                      type: "string",
                      description: "The original phrase with the issue",
                    },
                    correction: {
                      type: "string",
                      description: "The corrected phrase",
                    },
                    explanation: {
                      type: "string",
                      description: "Explanation of why this is an issue",
                    },
                  },
                  required: [
                    "type",
                    "severity",
                    "original",
                    "correction",
                    "explanation",
                  ],
                },
              },
            },
            required: ["corrected", "issues"],
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API error: ${response.statusText} - ${errorText}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    const content = data.candidates[0].content.parts[0].text;

    try {
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          console.error("Failed to parse extracted JSON:", jsonMatch[0]);
        }
      }
      console.error("Failed to parse JSON:", content);
      throw new Error("Invalid JSON response from AI provider.");
    }
  }
}
