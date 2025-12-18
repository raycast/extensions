import { AI, environment, showToast, Toast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useEffect, useState } from "react";

export function useAISearch(
  allIconNames: string,
  searchText: string,
  filteredIconsLength: number,
  manualAISearch: boolean,
) {
  const [toast, setToast] = useState<Toast | null>(null);

  const prompt = `Here is a list of all available icon names: ${allIconNames}\nReturn the icon names in the list, separated by commas and with no additional text, that best match the semantic meaning of the following description: ${searchText}\nYou should return at least one icon name.`;

  const {
    data: modelResponse,
    isLoading: isAILoading,
    revalidate: revalidateAI,
  } = useAI(prompt, {
    model: AI.Model["OpenAI_GPT4o-mini"],
    execute: environment.canAccess(AI) && searchText.length > 0 && (filteredIconsLength === 0 || manualAISearch),
    onError: (error) => {
      console.error("AI search error:", error);
    },
  });

  // Cleanup toast on unmount
  useEffect(() => {
    return () => {
      if (toast) {
        toast.hide();
      }
    };
  }, [toast]);

  if (isAILoading && !toast) {
    showToast({
      style: Toast.Style.Animated,
      title: "Searching with AI…",
    }).then(setToast);
  } else if (!isAILoading && toast) {
    toast.hide();
    setToast(null);
  }

  return { modelResponse, isAILoading, revalidateAI };
}
