import { AI, Icon, environment } from "@raycast/api";
import { useAI, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { parseModelResponse } from "../utils";

export function useIconSearch() {
  const [searchText, setSearchText] = useState("");
  const [manualAISearch, setManualAISearch] = useState(false);

  const { data: allIconNames } = useCachedPromise(async () => Object.keys(Icon).join(", "), [], { initialData: "" });

  const { data: filteredIcons } = useCachedPromise(
    async (text: string) => {
      if (text.length === 0) return Object.entries(Icon);
      const lowercaseText = text.toLowerCase();
      return Object.entries(Icon).filter(([name]) => name.toLowerCase().includes(lowercaseText));
    },
    [searchText],
    {
      initialData: Object.entries(Icon),
      keepPreviousData: true,
    },
  );

  const prompt = `Here is a list of all available icon names: ${allIconNames}\nReturn the icon names in the list, separated by commas and with no additional text, that best match the semantic meaning of the following description: ${searchText}\nYou should return at least one icon name.`;

  const {
    data: modelResponse,
    isLoading: isAILoading,
    revalidate: revalidateAI,
  } = useAI(prompt, {
    model: AI.Model["OpenAI_GPT4o-mini"],
    execute: environment.canAccess(AI) && searchText.length > 0 && (filteredIcons.length === 0 || manualAISearch),
  });

  const iconEntries = useMemo(() => {
    if (searchText.length === 0) return Object.entries(Icon);
    if (environment.canAccess(AI) && modelResponse && (filteredIcons.length === 0 || manualAISearch)) {
      return parseModelResponse(modelResponse).map((name) => [name, Icon[name as keyof typeof Icon]]);
    }
    return filteredIcons;
  }, [searchText, modelResponse, filteredIcons, manualAISearch]);

  return {
    searchText,
    setSearchText,
    manualAISearch,
    setManualAISearch,
    iconEntries,
    isAILoading,
    revalidateAI,
    filteredIcons,
  };
}
