import { getPreferenceValues } from "@raycast/api";
import Anthropic from "@anthropic-ai/sdk";
import { useState } from "react";

export function useAnthropic(): Anthropic {
  const [anthropic] = useState(() => {
    const preferences = getPreferenceValues<{
      apiKey: string;
      useBetaFeatures: boolean;
    }>();

    const apiKey = preferences.apiKey;
    const useBetaFeatures = preferences.useBetaFeatures;

    const config: Anthropic.AnthropicOptions = {
      apiKey: apiKey,
    };

    if (useBetaFeatures) {
      config.defaultHeaders = {
        "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
      };
    }

    return new Anthropic(config);
  });

  return anthropic;
}
