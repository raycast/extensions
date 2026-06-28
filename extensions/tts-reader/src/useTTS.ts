import { getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";
import { speakText } from "./speak";
import { getConfigError } from "./tts-utils";
import { Preferences } from "./types";

export function useTTS() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  const error = useMemo(() => {
    const message = getConfigError(preferences);
    return message ? new Error(message) : undefined;
  }, [preferences.serverUrl]);

  const speak = async (text: string) => {
    setIsLoading(true);
    try {
      return await speakText(text);
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
