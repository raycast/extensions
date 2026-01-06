import { Provider } from "./types";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export const openRouterProvider: Provider = {
  name: "OpenRouter",

  async sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://raycast.com",
          "X-Title": "Raycast Prompt Enhancer",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API failed: ${response.status} - ${errorText}`,
      );
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from the model");
    }

    return data.choices[0].message.content.trim();
  },
};
