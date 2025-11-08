import { getPreferenceValues } from "@raycast/api";
import { BaseProvider } from "./base";
import { PresetConfig, ProviderError, NetworkError } from "../core/types";

interface OllamaPreferences {
  ollamaUrl: string;
  ollamaModel: string;
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider extends BaseProvider {
  name = "Ollama";

  async enhance(prompt: string, preset: PresetConfig): Promise<string> {
    try {
      const preferences = getPreferenceValues<OllamaPreferences>();
      const { ollamaUrl, ollamaModel } = preferences;

      const formattedPrompt = this.formatPrompt(prompt, preset);

      const requestBody = {
        model: ollamaModel,
        messages: [
          {
            role: "user",
            content: formattedPrompt,
          },
        ],
        stream: false,
      };

      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new ProviderError(`Ollama request failed: ${response.status} ${response.statusText}`, "ollama");
      }

      const data = (await response.json()) as OllamaChatResponse;

      if (!data.message?.content) {
        throw new ProviderError("Invalid response from Ollama", "ollama");
      }

      return data.message.content.trim();
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error instanceof TypeError || (error as Error).message?.includes("fetch")) {
        throw new NetworkError("Cannot connect to Ollama. Make sure Ollama is running.");
      }

      throw new ProviderError(`Ollama enhancement failed: ${error}`, "ollama");
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const preferences = getPreferenceValues<OllamaPreferences>();
      const response = await fetch(`${preferences.ollamaUrl}/api/version`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const preferences = getPreferenceValues<OllamaPreferences>();
      const response = await fetch(`${preferences.ollamaUrl}/api/tags`);

      if (!response.ok) return [];

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      return data.models?.map((model) => model.name) || [];
    } catch {
      return [];
    }
  }
}
