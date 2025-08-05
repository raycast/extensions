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
    });
  });

  return anthropic;
}
