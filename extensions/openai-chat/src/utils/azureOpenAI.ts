import { AzureKeyCredential, OpenAIClient } from "@azure/openai";

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
}

export function AzureOpenAI(config: AzureOpenAIConfig) {
  return new OpenAIClient(config.endpoint, new AzureKeyCredential(config.apiKey));
}
