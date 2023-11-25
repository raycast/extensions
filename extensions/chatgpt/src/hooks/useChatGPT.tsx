import { getPreferenceValues } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { useState } from "react";
import { ConfigurationPreferences } from "../type";
import { getConfigUrl } from "../utils";

export function useChatGPT(): OpenAIApi {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<ConfigurationPreferences>();
    const getConfig = function (params: ConfigurationPreferences) {
      return new Configuration({
        apiKey: params.apiKey,
        basePath: getConfigUrl(params),
      });
    };
    const config = getConfig(preferences);
    return new OpenAIApi(config);
  });
  return chatGPT;
}

export function getConfiguration(): ConfigurationPreferences {
  return getPreferenceValues<ConfigurationPreferences>();
}
