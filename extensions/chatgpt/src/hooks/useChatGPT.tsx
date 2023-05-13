import { getPreferenceValues } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { useState } from "react";
import { ConfigurationPreferences } from "../type";

export function useChatGPT(): OpenAIApi {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<{
      apiKey: string;
      useAzure: boolean;
      azureEndpoint: string;
      azureDeployment: string;
    }>();
    const getConfig = function ({ useAzure, apiKey, azureEndpoint, azureDeployment }: ConfigurationPreferences) {
      if (useAzure) {
        return new Configuration({
          apiKey,
          basePath: azureEndpoint + "/openai/deployments/" + azureDeployment,
        });
      } else {
        return new Configuration({ apiKey });
      }
    };
    const config = getConfig(preferences);
    return new OpenAIApi(config);
  });
  return chatGPT;
}

export function getConfiguration(): ConfigurationPreferences {
  return getPreferenceValues<{
    apiKey: string;
    useAzure: boolean;
    azureEndpoint: string;
    azureDeployment: string;
  }>();
}
