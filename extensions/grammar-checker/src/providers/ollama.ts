import { CheckResult, LLMProvider, ProviderConfig } from "../api";
import { getSystemPrompt } from "../styles";

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama3";
  }

  async analyzeText(text: string, style: string): Promise<CheckResult> {
    const systemPrompt = getSystemPrompt(style);

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error: ${response.statusText} - ${errorText}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    const content = data.message.content;

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
