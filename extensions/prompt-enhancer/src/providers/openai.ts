import { Provider } from "./types";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export const openaiProvider: Provider = {
  name: "OpenAI",

  async sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenAI");
    }

    return data.choices[0].message.content.trim();
  },
};
