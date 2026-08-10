import { IConfig, IModel } from "../types";

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "mixtral-8x7b-32768",
    name: "mixtral-8x7b-32768",
  },
  supportCustomModel: false,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, _: string | undefined): Promise<IModel[]> {
    return Promise.resolve([
      { name: "mixtral-8x7b-32768", id: "mixtral-8x7b-32768" },
      { name: "gemma-7b-it", id: "gemma-7b-it" },
      { name: "llama2-70b-4096", id: "llama2-70b-4096" },
    ]);
  },
  defaultEntrypoint: "https://api.groq.com/openai/v1/chat/completions",
  supportCustomEntrypoint: false,
  requireApiKey: true,
  hasApiKey: true,
};

export default config;
