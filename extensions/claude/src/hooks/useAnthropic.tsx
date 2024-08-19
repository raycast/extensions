import { getPreferenceValues } from "@raycast/api";
import Anthropic from "@anthropic-ai/sdk";
import { useState } from "react";

export function useAnthropic(): Anthropic {
  const [anthropic] = useState(() => {
    const apiKey = getPreferenceValues<{
      apiKey: string;
    }>().apiKey;

    return new Anthropic({
      apiKey: apiKey,
      defaultHeaders: {
        "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
      },
    });
  });

  return anthropic;
}
