import { Provider } from "./types";

interface OllamaResponse {
  message?: {
    content: string;
  };
  error?: string;
}

export const ollamaProvider: Provider = {
  name: "Ollama (Local)",

  async sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string> {
    // Ollama runs locally, no API key needed
    void apiKey;
    // Default endpoint is localhost:11434
    const baseUrl = "http://localhost:11434";

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API failed: ${response.status} - ${errorText}. Is Ollama running?`,
      );
    }

    const data = (await response.json()) as OllamaResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.message || !data.message.content) {
      throw new Error("No response from Ollama");
    }

    return data.message.content.trim();
  },
};
