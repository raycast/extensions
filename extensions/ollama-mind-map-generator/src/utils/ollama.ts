import fetch from "node-fetch";
import { OllamaResponse, OllamaTagsResponse } from "./types";

export async function getInstalledModels(apiUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${apiUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const models = data.models.map((model) => model.name);

    if (models.length === 0) {
      throw new Error("No models installed. Please install at least one model using 'ollama pull <model>'");
    }

    return models;
  } catch (error) {
    console.error("Failed to fetch models:", error);
    throw error;
  }
}

export async function generateOllamaResponse(apiUrl: string, model: string, prompt: string): Promise<string> {
  const response = await fetch(`${apiUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        num_ctx: 8192, // Increased context window
        num_predict: 8192, // Increased token limit for response
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaResponse;
  console.log("API RESPONSE LENGTH:", data.response.length);
  return data.response;
}
