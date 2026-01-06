import { Provider } from "./types";

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

export const geminiProvider: Provider = {
  name: "Google Gemini",

  async sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini");
    }

    return data.candidates[0].content.parts[0].text.trim();
  },
};
