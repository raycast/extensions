import { useLocalStorage } from "@raycast/utils";
import { STORE } from "../constants";

export function useWordStorage(key: STORE) {
  const { value: words, setValue: setWords, isLoading } = useLocalStorage<WordEntry[]>(key, []);

  const removeWord = async (word: string) => {
    const updatedWords = words?.filter((wordEntry) => wordEntry.word !== word);
    await setWords(updatedWords || []);
  };

  return { words: words || [], removeWord, isLoading };
}
