import { AI, getPreferenceValues, LocalStorage } from "@raycast/api";
import https from "https";

export interface AIPreferences {
  aiProvider?: string;
  apiKey?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
}

interface ModelEntry {
  id: string;
  name?: string;
  display_name?: string;
  displayName?: string;
}

interface GeminiModel {
  name: string;
  displayName: string;
}

export class LLMService {
  public static get config(): AIPreferences {
    return getPreferenceValues<AIPreferences>();
  }

  public static async getProvider(): Promise<string> {
    const saved = await LocalStorage.getItem<string>("configured_provider");
    return saved || this.config.aiProvider || "raycast";
  }

  public static async getApiKey(provider: string): Promise<string> {
    const saved = await LocalStorage.getItem<string>(`api_key_${provider}`);
    if (saved) return saved;
    return this.config.apiKey || "";
  }

  public static async getSelectedModel(): Promise<string> {
    const provider = await this.getProvider();
    const key = `selected_model_${provider}`;
    const saved = await LocalStorage.getItem<string>(key);
    if (saved) return saved;
    return "";
  }

  public static async fetchModelsWithKey(
    provider: string,
    key: string,
  ): Promise<Model[]> {
    if (provider === "openai") {
      const oai = await this.request(
        "https://api.openai.com/v1/models",
        "GET",
        { Authorization: `Bearer ${key}` },
        null,
      );
      return oai.data
        .map((m: ModelEntry) => ({ id: m.id, name: m.id }))
        .sort((a: Model, b: Model) => a.id.localeCompare(b.id));
    }
    if (provider === "anthropic") {
      const ant = await this.request(
        "https://api.anthropic.com/v1/models",
        "GET",
        { "x-api-key": key, "anthropic-version": "2023-06-01" },
        null,
      );
      return ant.data
        .map((m: ModelEntry) => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a: Model, b: Model) => a.id.localeCompare(b.id));
    }
    if (provider === "gemini") {
      const gem = await this.request(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        "GET",
        {},
        null,
      );
      return gem.models
        .filter((m: GeminiModel) => m.name.includes("gemini"))
        .map((m: GeminiModel) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName,
        }));
    }
    if (provider === "openrouter") {
      const or = await this.request(
        "https://openrouter.ai/api/v1/models",
        "GET",
        {},
        null,
      );
      return or.data.map((m: ModelEntry) => ({
        id: m.id,
        name: m.name || m.id,
      }));
    }
    return [];
  }

  public static async fetchModels(): Promise<Model[]> {
    const { aiProvider, apiKey } = this.config;
    if (!apiKey && aiProvider !== "raycast")
      throw new Error("API Key required");
    return this.fetchModelsWithKey(aiProvider || "raycast", apiKey || "");
  }

  public static async askAI(prompt: string): Promise<string> {
    const aiProvider = await this.getProvider();
    const model = await this.getSelectedModel();
    const apiKey = await this.getApiKey(aiProvider);

    if (aiProvider === "raycast") {
      return await this.callRaycastAI(prompt);
    }

    if (!apiKey) {
      throw new Error(
        `API Key is required for ${aiProvider}. Configure it via "Configure AI Model" command.`,
      );
    }

    if (aiProvider === "openai")
      return await this.callOpenAI(apiKey, model, prompt);
    if (aiProvider === "anthropic")
      return await this.callAnthropic(apiKey, model, prompt);
    if (aiProvider === "gemini")
      return await this.callGemini(apiKey, model, prompt);
    if (aiProvider === "openrouter")
      return await this.callOpenRouter(apiKey, model, prompt);
    throw new Error(`Unknown Provider: ${aiProvider}`);
  }

  private static async callRaycastAI(prompt: string): Promise<string> {
    try {
      return await AI.ask(prompt);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("Model is not supported")) {
        throw new Error(
          "Raycast AI is not supported on this device. Please select OpenAI/Gemini in Settings.",
        );
      }
      throw e;
    }
  }

  private static async callOpenAI(
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    };
    const response = await this.post(
      "https://api.openai.com/v1/chat/completions",
      key,
      body,
    );
    return response.choices?.[0]?.message?.content?.trim() || "";
  }

  private static async callAnthropic(
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    };
    const headers = {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };
    const response = await this.request(
      "https://api.anthropic.com/v1/messages",
      "POST",
      headers,
      body,
    );
    return response.content?.[0]?.text?.trim() || "";
  }

  private static async callGemini(
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
    };
    const response = await this.request(
      url,
      "POST",
      { "Content-Type": "application/json" },
      body,
    );
    return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  private static async callOpenRouter(
    key: string,
    model: string,
    prompt: string,
  ): Promise<string> {
    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
    };
    const headers = {
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://raycast.com",
      "X-Title": "Raycast Stealth AI",
      "Content-Type": "application/json",
    };
    const response = await this.request(
      "https://openrouter.ai/api/v1/chat/completions",
      "POST",
      headers,
      body,
    );
    return response.choices?.[0]?.message?.content?.trim() || "";
  }

  private static post(
    url: string,
    apiKey: string,
    body: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    return this.request(
      url,
      "POST",
      {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    );
  }

  private static request(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method, headers }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`API Auth Error (${res.statusCode}): ${data}`));
            }
          } catch (_e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on("error", (e) => reject(e));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}
