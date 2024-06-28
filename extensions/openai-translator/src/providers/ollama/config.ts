import { IConfig, IModel } from "../types";

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "llama2",
    name: "Llama 2",
  },
  supportCustomModel: true,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined): Promise<IModel[]> {
    return Promise.resolve([
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
    ]);
  },
  defaultEntrypoint: "http://localhost:11434/v1/chat/completions",
  supportCustomEntrypoint: true,
  requireApiKey: false,
  hasApiKey: false,
};

export default config;
