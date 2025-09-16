import { showToast, Toast } from "@raycast/api";
import { OllamaModel, OllamaModelsResponse, ChatMessage, OllamaChatResponse } from "./types";

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    const url = `${this.baseUrl}/api/tags`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaModelsResponse;

    if (!data || !data.models) {
      return [];
    }

    return data.models;
  }

  async sendChatMessage(model: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message.content;
  }

  async sendChatMessageStream(model: string, messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaChatResponse;
            if (data.message?.content) {
              onChunk(data.message.content);
            }
          } catch {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export async function showErrorToast(title: string, message?: string) {
  await showToast({ style: Toast.Style.Failure, title, message });
}

export async function showSuccessToast(title: string, message?: string) {
  await showToast({ style: Toast.Style.Success, title, message });
}
