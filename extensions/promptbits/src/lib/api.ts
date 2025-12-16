import { getPreferenceValues } from "@raycast/api";
import type { Prompt, PromptsResponse } from "./types";

interface Preferences {
  apiKey: string;
}

const API_URL = "https://www.promptbits.dev/api/external/prompts";

export async function fetchPrompts(): Promise<Prompt[]> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const response = await fetch(API_URL, {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your API key in extension preferences.");
    }
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  const data: PromptsResponse = await response.json();
  return data.prompts;
}
