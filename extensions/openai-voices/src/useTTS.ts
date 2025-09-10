import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useMemo, useState } from "react";
import { createSpeech } from "./tts-utils";
import { Preferences } from "./types";

export function useTTS() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  const { openai, error } = useMemo(() => {
    if (!preferences.openaiApiKey) {
      return {
        openai: null,
        error: new Error("Missing OpenAI API Key"),
      };
    }

    return {
      openai: new OpenAI({
        apiKey: preferences.openaiApiKey,
      }),
      error: undefined,
    };
  }, [preferences.openaiApiKey]);

  const speak = async (text: string) => {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    setIsLoading(true);
    try {
      return await createSpeech(text, openai);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isReady: !error,
    speak,
    isLoading,
    error,
  };
}
