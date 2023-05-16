import { getPreferenceValues } from "@raycast/api";
import { Configuration, ConfigurationParameters, OpenAIApi } from "openai";
import { useState } from "react";
import { ConfigurationPreferences } from "../type";

export function useChatGPT(): OpenAIApi {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<{
      apiKey: string;
      useAzure: boolean;
      useSelfHost: boolean;
      selfHost: string;
      azureEndpoint: string;
      azureDeployment: string;
    }>();
    const getConfig = function ({
      useAzure,
      apiKey,
      azureEndpoint,
      azureDeployment,
      useSelfHost,
      selfHost,
    }: ConfigurationPreferences) {
      let config: ConfigurationParameters = { apiKey };

      if (useAzure) {
        config = { ...config, basePath: azureEndpoint + "/openai/deployments/" + azureDeployment };
      }
      if (useSelfHost) {
        config = { ...config, basePath: selfHost };
      }
      console.log(config)
      return new Configuration(config);
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
    useSelfHost: boolean;
    selfHost: string;
  }>();
}
