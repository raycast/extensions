import { useState, useEffect, useCallback } from "react";
import { Toast, showToast } from "@raycast/api";
import { WordExplanation } from "../types";
import { getWordExplanation } from "../services/wordService";

export function useWordSearch(
  savedWordsMap: Map<string, WordExplanation>,
  isLoadingSaved: boolean,
  initialWord?: string,
) {
  const [searchText, setSearchText] = useState(initialWord || "");
  const [aiResult, setAiResult] = useState<WordExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setAiResult(null);
        return;
      }

      const searchLower = searchTerm.toLowerCase();

      // Check if word exists locally
      const localWord = savedWordsMap.get(searchLower);

      if (localWord) {
        // Word exists locally, no need to query AI
        setAiResult(null);
        return;
      }

      // Clear previous AI result when starting a new search
      setAiResult(null);

      // Only query AI if word doesn't exist locally
      setIsLoading(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Querying "${searchTerm}"...`,
      });

      try {
        const result = await getWordExplanation(searchTerm.trim());

        if (result) {
          toast.style = Toast.Style.Success;
          toast.title = "Query completed!";
          setAiResult(result);
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to get explanation";
          toast.message = "Please check the word and try again";
          setAiResult(null);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error occurred";
        toast.message = String(error);
        setAiResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [savedWordsMap],
  );

  // Auto-trigger if word is provided as argument
  useEffect(() => {
    if (initialWord && initialWord.trim() && !isLoadingSaved) {
      setSearchText(initialWord.trim());
      handleSearch(initialWord.trim());
    }
  }, [initialWord, isLoadingSaved, handleSearch]);

  // Clear AI result when search text changes
  useEffect(() => {
    if (aiResult && searchText.trim() !== aiResult.word) {
      setAiResult(null);
    }
  }, [searchText, aiResult]);

  const clearAiResult = () => {
    setAiResult(null);
  };

  return {
    searchText,
    setSearchText,
    aiResult,
    isLoading,
    handleSearch,
    clearAiResult,
  };
}
