import { CheckResult, LLMProvider, ProviderConfig } from "../api";
import { getSystemPrompt } from "../styles";

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || "";
    this.model = config.model || "gpt-3.5-turbo";
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
  }

  async analyzeText(text: string, style: string): Promise<CheckResult> {
    if (!this.apiKey) {
      throw new Error("API Key is required.");
    }

    const systemPrompt = getSystemPrompt(style);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Example Provider API error: ${response.statusText} - ${errorText}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    const content = data.choices[0].message.content;

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
