import { AI, environment } from "@raycast/api";
import { useMemo } from "react";
import { LucideIcon } from "../types";

export function useIconFiltering(
  allIcons: LucideIcon[] | undefined,
  searchText: string,
  modelResponse?: string,
  manualAISearch?: boolean,
  preFilteredIcons?: LucideIcon[],
) {
  const filteredIcons = useMemo(() => {
    if (!allIcons) return [];
    if (searchText.length === 0) return allIcons;
    const lowercaseText = searchText.toLowerCase();
    return allIcons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(lowercaseText) ||
        icon.keywords.some((keyword: string) => keyword.toLowerCase().includes(lowercaseText)),
    );
  }, [allIcons, searchText]);

  const parseModelResponse = (results: string | undefined): string[] => {
    if (!results) return [];
    return results
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && allIcons?.some((icon) => icon.name === item));
  };

  const iconEntries = useMemo(() => {
    if (!allIcons) return [];
    if (searchText.length === 0) return allIcons;
    if (modelResponse && (preFilteredIcons?.length === 0 || manualAISearch)) {
      const aiResults = parseModelResponse(modelResponse);
      return allIcons.filter((icon) => aiResults.includes(icon.name));
    }
    return preFilteredIcons || filteredIcons;
  }, [allIcons, searchText, modelResponse, preFilteredIcons, filteredIcons, manualAISearch]);

  const isAIResultsSection =
    environment.canAccess(AI) &&
    searchText.length > 0 &&
    modelResponse !== undefined &&
    (preFilteredIcons?.length === 0 || manualAISearch);

  return { filteredIcons, iconEntries, isAIResultsSection };
}
