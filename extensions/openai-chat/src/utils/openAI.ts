import { OpenAIApi, Configuration } from "openai";

export interface OpenAIConfig {
  endpoint: string;
  apiKey: string;
}

export function OpenAI(config: OpenAIConfig) {
  const configuration = new Configuration({
    basePath: config.endpoint,
    apiKey: config.apiKey,
  });

  return new OpenAIApi(configuration);
}
