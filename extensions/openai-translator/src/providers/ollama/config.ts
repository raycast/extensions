import { IConfig, IModel } from "../types";

function getBaseUrl(fullUrl: string): string | null {
  try {
    const parsedUrl = new URL(fullUrl);
    // Return the base URL (protocol + host)
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch (e) {
    console.error("Invalid URL:", e);
    return null; // Return null if the URL is invalid
  }
}

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "llama2",
    name: "Llama 2",
  },
  supportCustomModel: true,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, entrypoint: string | undefined): Promise<IModel[]> {
    const fallbackModels: IModel[] = [
      { id: "llama2", name: "Llama 2" },
      { id: "mistral", name: "Mistral" },
      { id: "dolphin-phi", name: "Dolphin Phi" },
      { id: "phi", name: "Phi-2" },
      { id: "neural-chat", name: "Neural Chat" },
      { id: "starling-lm", name: "Starling" },
      { id: "codellama", name: "Code Llama" },
      { id: "llama2-uncensored", name: "Llama 2 Uncensored" },
      { id: "llama2:13b", name: "Llama 2 13B" },
      { id: "llama2:70b", name: "Llama 2 70B" },
      { id: "orca-mini", name: "Orca Mini" },
      { id: "vicuna", name: "Vicuna" },
      { id: "llava", name: "LLaVA" },
      { id: "gemma:2b", name: "Gemma 2B" },
      { id: "gemma:7b", name: "Gemma 7B" },
    ];
    let result = fallbackModels;

    if (entrypoint && entrypoint !== "") {
      const url = getBaseUrl(entrypoint) + "/api/tags";
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apikey}`,
          },
        });
        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`);
        }
        const data = (await response.json()) as { models: { name: string }[] };
        // check gpt inside the model list
        result = data.models.map((model: { name: string }) => ({
          name: model.name,
          id: model.name,
        }));
        return result;
      } catch (error) {
        console.error("Failed to fetch model list from API, using fallback models:", error);
      }
    }

    return Promise.resolve(result);
  },
  defaultEntrypoint: "http://localhost:11434/v1/chat/completions",
  supportCustomEntrypoint: true,
  requireApiKey: false,
  hasApiKey: false,
};

export default config;
