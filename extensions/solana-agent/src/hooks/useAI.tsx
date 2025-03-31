import { createOpenAI } from "@ai-sdk/openai";
import type { Preferences } from "../type";
import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";

export default function useAI() {
  const preferences = getPreferenceValues<Preferences>();

  const openai = useMemo(
    () =>
      createOpenAI({
        apiKey: preferences.apiKey,
        baseURL: preferences.useApiEndpoint ? preferences.apiEndpoint : undefined,
      }),
    [preferences.apiKey, preferences.useApiEndpoint, preferences.apiEndpoint],
  );

  return openai;
}
