import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";

interface KimiConfig {
  apiKey: string;
  baseURL: string;
}

export function useKimi(): KimiConfig {
  const [config] = useState(() => {
    const apiKey = getPreferenceValues<Preferences>().apiKey;

    return {
      apiKey: apiKey,
      baseURL: "https://api.moonshot.ai/v1",
    };
  });

  return config;
}
