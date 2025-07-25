import { useState, useEffect } from "react";
import { Toast, showToast } from "@raycast/api";
import { WordExplanation } from "../types";
import { parseSavedWords } from "../services/wordService";
import { getVocabularyPath } from "../config";

export function useSavedWords() {
  const [savedWords, setSavedWords] = useState<WordExplanation[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [savedWordsMap, setSavedWordsMap] = useState<Map<string, WordExplanation>>(new Map());

  const loadSavedWords = async () => {
    try {
      const vocabularyPath = getVocabularyPath();
      const words = parseSavedWords(vocabularyPath);
      setSavedWords(words);

      // Create a map for quick lookup
      const wordsMap = new Map<string, WordExplanation>();
      words.forEach((word) => wordsMap.set(word.word.toLowerCase(), word));
      setSavedWordsMap(wordsMap);
    } catch (error) {
      console.error("Error loading saved words:", error);
      showFailureToast(error, { title: "Failed to load saved words" });
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // Load saved words when CLI is installed
  useEffect(() => {
    loadSavedWords();
  }, []);

  return {
    savedWords,
    isLoadingSaved,
    savedWordsMap,
    loadSavedWords,
  };
}
