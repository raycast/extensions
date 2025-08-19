import { useMemo } from "react";
import { MdDefinition } from "../types";

export function useMdDefinitionFiltering(
  savedMdDefinitions: MdDefinition[],
  aiResult: MdDefinition | null,
  searchText: string,
) {
  // Filter saved md definitions based on search text
  const filteredSavedMdDefinitions = useMemo(
    () =>
      savedMdDefinitions.filter(
        (mdDefinition) =>
          searchText.trim() === "" || mdDefinition.text.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [savedMdDefinitions, searchText],
  );

  // Combine AI result with saved md definitions
  const allMdDefinitions = useMemo(
    () => (aiResult ? [aiResult, ...filteredSavedMdDefinitions] : filteredSavedMdDefinitions),
    [aiResult, filteredSavedMdDefinitions],
  );

  return {
    filteredSavedMdDefinitions,
    allMdDefinitions,
  };
}
