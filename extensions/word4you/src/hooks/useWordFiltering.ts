import { useMemo } from "react";
import { WordExplanation } from "../types";

export function useWordFiltering(savedWords: WordExplanation[], aiResult: WordExplanation | null, searchText: string) {
  // Filter saved words based on search text
  const filteredSavedWords = useMemo(
    () =>
      savedWords.filter(
        (word) => searchText.trim() === "" || word.word.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [savedWords, searchText],
  );

  // Combine AI result with saved words
  const allWords = useMemo(
    () => (aiResult ? [aiResult, ...filteredSavedWords] : filteredSavedWords),
    [aiResult, filteredSavedWords],
  );

  return {
    filteredSavedWords,
    allWords,
  };
}
