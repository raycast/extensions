import { Provider } from "./types";

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export const groqProvider: Provider = {
  name: "Groq",

  async sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string> {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Groq");
    }

    return data.choices[0].message.content.trim();
  },
};
