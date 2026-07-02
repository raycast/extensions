import { getPreferenceValues } from "@raycast/api";
import { Ollama } from "ollama";
import { useMemo } from "react";

export function useOllama() {
  const ollama = useMemo(() => {
    const { ollamaUrl } = getPreferenceValues<Preferences>();
    return new Ollama({ host: ollamaUrl });
  }, []);

  return ollama;
}
