import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { STORE } from "../constants";
import { getDynamicRandomWordTranslation } from "../utils";
import { useConfig } from "./use-config";

export const useWordEntry = (cb?: (we: WordEntry) => void) => {
  const { config } = useConfig();

  const [isLoading, setIsLoading] = useState(false);
  const { value: wordEntry, setValue: setWordEntry } = useLocalStorage<WordEntry>(STORE.WORD_ENTRY);

  const updateWord = async () => {
    setIsLoading(true);
    try {
      const newWordEntry = await getDynamicRandomWordTranslation({
        from: config.firstLanguage,
        to: config.secondLanguage,
      });
      if (!newWordEntry) return;
      cb?.(newWordEntry);
      await setWordEntry(newWordEntry); //TODO: word is not updated due to state
    } catch (error) {
      console.log("🛑  error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { wordEntry, updateWord, isLoading };
};
