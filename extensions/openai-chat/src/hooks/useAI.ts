import { getPreferenceValues } from "@raycast/api";
import useAzureOpenAI from "./useAzureOpenAI";
import useOpenAI from "./useOpenAI";

export interface AppPreference {
  openAiType: "Azure OpenAI" | "OpenAI";
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export const useAI = (prompt: string) => {
  const appPreference = getPreferenceValues<AppPreference>();

  const serverMap = {
    "Azure OpenAI": () => {
      if (!appPreference.endpoint) throw new Error("Endpoint is empty!");
      if (!appPreference.apiKey) throw new Error("API Key is empty!");
      if (!appPreference.model) throw new Error("Model is empty!");

      return useAzureOpenAI(
        {
          endpoint: appPreference.endpoint,
          apiKey: appPreference.apiKey,
          deployment: appPreference.model,
        },
        prompt
      );
    },
    OpenAI: () => {
      if (!appPreference.apiKey) throw new Error("API Key is empty!");
      if (!appPreference.model) throw new Error("Model is empty!");

      return useOpenAI(
        {
          endpoint: appPreference.endpoint,
          apiKey: appPreference.apiKey,
          model: appPreference.model,
        },
        prompt
      );
    },
  };

  return serverMap[appPreference.openAiType]();
};
