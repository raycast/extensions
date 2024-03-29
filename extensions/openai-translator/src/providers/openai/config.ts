import { IConfig, IModel } from "../types";

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "gpt-3.5-turbo",
    name: "gpt-3.5-turbo",
  },
  supportCustomModel: true,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined): Promise<IModel[]> {
    return Promise.resolve([
      { name: "gpt-3.5-turbo-1106", id: "gpt-3.5-turbo-1106" },
      { name: "gpt-3.5-turbo", id: "gpt-3.5-turbo" },
      { name: "gpt-3.5-turbo-0613", id: "gpt-3.5-turbo-0613" },
      { name: "gpt-3.5-turbo-0301", id: "gpt-3.5-turbo-0301" },
      { name: "gpt-3.5-turbo-16k", id: "gpt-3.5-turbo-16k" },
      { name: "gpt-3.5-turbo-16k-0613", id: "gpt-3.5-turbo-16k-0613" },
      { name: "gpt-4", id: "gpt-4" },
      { name: "gpt-4-turbo-preview", id: "gpt-4-turbo-preview" },
      { name: "gpt-4-0125-preview (recommended)", id: "gpt-4-0125-preview" },
      { name: "gpt-4-1106-preview", id: "gpt-4-1106-preview" },
      { name: "gpt-4-0314", id: "gpt-4-0314" },
      { name: "gpt-4-0613", id: "gpt-4-0613" },
      { name: "gpt-4-32k", id: "gpt-4-32k" },
      { name: "gpt-4-32k-0314", id: "gpt-4-32k-0314" },
      { name: "gpt-4-32k-0613", id: "gpt-4-32k-0613" },
    ]);
  },
  defaultEntrypoint: "https://api.openai.com/v1/chat/completions",
  supportCustomEntrypoint: true,
  requireApiKey: false,
  hasApiKey: true,
};

export default config;
