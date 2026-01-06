import { CheckResult, LLMProvider, ProviderConfig } from "../api";
import { getSystemPrompt } from "../styles";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || "";
    this.model = config.model || "claude-3-sonnet-20240229";
  }

  async analyzeText(text: string, style: string): Promise<CheckResult> {
    if (!this.apiKey) {
      throw new Error("API Key is required.");
    }

    const systemPrompt = getSystemPrompt(style);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic API error: ${response.statusText} - ${errorText}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    const content = data.content[0].text;

    try {
      // Find JSON in content if it's wrapped in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON:", content);
      throw new Error("Invalid JSON response from AI provider.");
    }
  }
}
