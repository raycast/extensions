import { useState, useEffect, useCallback } from "react";
import { Toast, showToast } from "@raycast/api";
import { MdDefinition } from "../types";
import { getMdDefinitionExplanation } from "../services/mdDefinitionService";

export function useMdDefinitionSearch(
  savedMdDefinitionsMap: Map<string, MdDefinition>,
  isLoadingSaved: boolean,
  initialText?: string,
) {
  const [searchText, setSearchText] = useState(initialText || "");
  const [aiResult, setAiResult] = useState<MdDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setAiResult(null);
        return;
      }

      const searchLower = searchTerm.toLowerCase();

      // Check if text exists locally
      const localMdDefinition = savedMdDefinitionsMap.get(searchLower);

      if (localMdDefinition) {
        // Text exists locally, no need to query AI
        setAiResult(null);
        return;
      }

      // Clear previous AI result when starting a new search
      setAiResult(null);

      // Only query AI if text doesn't exist locally
      setIsLoading(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Querying "${searchTerm}"...`,
      });

      const result = await getMdDefinitionExplanation(searchTerm.trim());

      if (result) {
        toast.style = Toast.Style.Success;
        toast.title = "Query completed!";
        setAiResult(result);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to get explanation";
        setAiResult(null);
      }

      setIsLoading(false);
    },
    [savedMdDefinitionsMap],
  );

  // Auto-trigger if text is provided as argument
  useEffect(() => {
    if (initialText && initialText.trim() && !isLoadingSaved) {
      setSearchText(initialText.trim());
      handleSearch(initialText.trim());
    }
  }, [initialText, isLoadingSaved, handleSearch]);

  // Clear AI result when search text changes
  useEffect(() => {
    if (aiResult && searchText.trim() !== aiResult.text) {
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
