import { useState, useEffect, useCallback } from "react";
import { MdDefinition } from "../types";
import { parseSavedMdDefinitions } from "../services/mdDefinitionService";
import { getVocabularyPath } from "../config";
import { showFailureToast } from "@raycast/utils";

export function useSavedMdDefinitions() {
  const [savedMdDefinitions, setSavedMdDefinitions] = useState<MdDefinition[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [savedMdDefinitionsMap, setSavedMdDefinitionsMap] = useState<Map<string, MdDefinition>>(new Map());

  const loadSavedMdDefinitions = useCallback(async () => {
    try {
      const vocabularyPath = getVocabularyPath();
      const mdDefinitions = parseSavedMdDefinitions(vocabularyPath);
      setSavedMdDefinitions(mdDefinitions);

      // Create a map for quick lookup
      const mdDefinitionsMap = new Map<string, MdDefinition>();
      mdDefinitions.forEach((mdDefinition) => mdDefinitionsMap.set(mdDefinition.text.toLowerCase(), mdDefinition));
      setSavedMdDefinitionsMap(mdDefinitionsMap);
    } catch (error) {
      console.error("Error loading saved md definitions:", error);
      await showFailureToast(error, { title: "Failed to load saved md definitions" });
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  // Load saved md definitions when CLI is installed
  useEffect(() => {
    loadSavedMdDefinitions();
  }, [loadSavedMdDefinitions]);

  return {
    savedMdDefinitions,
    isLoadingSaved,
    savedMdDefinitionsMap,
    loadSavedMdDefinitions,
  };
}
