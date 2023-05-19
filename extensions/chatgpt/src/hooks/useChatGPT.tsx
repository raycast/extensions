import { getPreferenceValues } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { useState } from "react";
import { ConfigurationPreferences } from "../type";

export function useChatGPT(): OpenAIApi {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<ConfigurationPreferences>();
    const getConfig = function (params: ConfigurationPreferences) {
      if (params.useAzure) {
        return new Configuration({
          apiKey: params.apiKey,
          basePath: params.azureEndpoint + "/openai/deployments/" + params.azureDeployment,
        });
      } else {
        return new Configuration({
          apiKey: params.apiKey,
          basePath: params.apiEndpoint ?? "https://api.openai.com/v1",
        });
      }
    };
    const config = getConfig(preferences);
    return new OpenAIApi(config);
  });
  return chatGPT;
}

export function getConfiguration(): ConfigurationPreferences {
  return getPreferenceValues<ConfigurationPreferences>();
}
