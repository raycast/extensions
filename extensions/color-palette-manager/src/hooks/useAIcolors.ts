import { AI, showToast, Toast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_COLOR_FIELDS, MAX_COLOR_FIELDS } from "../constants";
import { ColorItem } from "../types";
import { createColorItems, parseAIColors } from "../utils/aiColorProcessing";
import { composeColorPrompt, composeDescriptionPrompt, composeTitlePrompt } from "../utils/aiPrompts";

type UseAIcolorsProps = {
  creativity: AI.Creativity;
  totalColors: string;
  prompt: string;
};

type UseAIcolorsReturn = {
  isLoading: boolean;
  colorItems: ColorItem[];
  title: string;
  description: string;
  error: string | null;
};

export function useAIcolors({
  creativity: requestedCreativity,
  totalColors: requestedTotalColors,
  prompt,
}: UseAIcolorsProps): UseAIcolorsReturn {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMessage, setIsLoadingMessage] = useState<string | null>(null);

  // Parse and validate color count with limit handling
  const [colorCount, setColorCount] = useState<number>(DEFAULT_COLOR_FIELDS);
  useEffect(() => {
    // Extract only digits from the input string
    const digitsOnly = requestedTotalColors?.replace(/\D/g, "") || "";
    const requestedColors = parseInt(digitsOnly !== "" ? digitsOnly : String(DEFAULT_COLOR_FIELDS), 10);
    setColorCount(Math.min(requestedColors, MAX_COLOR_FIELDS));
  }, [requestedTotalColors]);

  // Parse creativity with fallback
  const parsedCreativity =
    requestedCreativity && String(requestedCreativity).trim() !== "" ? requestedCreativity : "medium";

  // AI calls for colors, description, and title

  const modelConfig = {
    model: AI.Model.OpenAI_GPT4o,
    stream: false,
    creativity: parsedCreativity,
  };

  const creativity = String(parsedCreativity);

  const {
    data: jsonColors,
    isLoading: isLoadingJsonColors,
    error: jsonColorsError,
  } = useAI(composeColorPrompt({ prompt, colorCount, creativity }), modelConfig);

  const {
    data: description,
    isLoading: isLoadingDescription,
    error: descriptionError,
  } = useAI(composeDescriptionPrompt({ prompt, creativity }), modelConfig);

  const {
    data: title,
    isLoading: isLoadingTitle,
    error: titleError,
  } = useAI(composeTitlePrompt({ prompt, description, creativity }), {
    ...modelConfig,
    // Wait for the description fetch to settle before firing the title call,
    // otherwise composeTitlePrompt sees description = "" and we burn a credit on
    // an initial call that's then re-issued once description resolves.
    execute: !isLoadingDescription,
  });

  // Set error state if any AI call fails
  useEffect(() => {
    if (jsonColorsError) {
      setError("Failed to create colors. Please try again.");
    } else if (descriptionError) {
      setError("Failed to create description. Please try again.");
    } else if (titleError) {
      setError("Failed to create title. Please try again.");
    } else {
      setError(null);
    }
  }, [jsonColorsError, descriptionError, titleError]);

  useEffect(() => {
    if (isLoadingJsonColors) {
      setIsLoadingMessage("Loading colors...");
    } else if (isLoadingDescription) {
      setIsLoadingMessage("Loading description...");
    } else if (isLoadingTitle) {
      setIsLoadingMessage("Loading title...");
    } else {
      setIsLoadingMessage(null);
    }

    if (!isLoadingJsonColors && !isLoadingDescription && !isLoadingTitle) {
      setIsLoading(false);
    }
  }, [isLoadingJsonColors, isLoadingDescription, isLoadingTitle]);

  useEffect(() => {
    showToast({
      style: isLoading ? Toast.Style.Animated : error ? Toast.Style.Failure : Toast.Style.Success,
      title: isLoading ? isLoadingMessage || "" : error ? error : `${colorCount} Colors created successfully!`,
    });
  }, [isLoading, isLoadingMessage, error, colorCount]);

  // Parse colors safely with validation
  const colors: string[] = useMemo(() => {
    const parsedColors = parseAIColors(jsonColors || "");
    return parsedColors;
  }, [jsonColors]);

  // Convert colors to ColorItems
  const colorItems: ColorItem[] = useMemo(() => {
    return createColorItems(colors);
  }, [colors]);

  return {
    isLoading,
    colorItems,
    title: title || "",
    description: description || "",
    error,
  };
}
