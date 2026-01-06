import { Provider } from "./types";

interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  error?: {
    message: string;
  };
}

export const anthropicProvider: Provider = {
  name: "Anthropic Claude",

  async sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic API failed: ${response.status} - ${errorText}`,
      );
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.content || data.content.length === 0) {
      throw new Error("No response from Anthropic");
    }

    const textContent = data.content.find((c) => c.type === "text");
    if (!textContent) {
      throw new Error("No text content in response");
    }

    return textContent.text.trim();
  },
};
