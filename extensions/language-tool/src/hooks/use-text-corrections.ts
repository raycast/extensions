import { useState, useMemo, useCallback } from "react";
import { Clipboard, showToast, Toast } from "@raycast/api";
import type { AppliedCorrections, CheckTextResponse } from "../types";
import {
  allDefaultCorrections,
  calculateCorrectedText,
  defaultReplacement,
} from "../utils/text-correction";

/**
 * Hook to manage text corrections
 */
export function useTextCorrections(
  textChecked: string,
  result: CheckTextResponse,
) {
  const [appliedSuggestions, setAppliedSuggestions] =
    useState<AppliedCorrections>(new Map());

  // Current corrected text
  const correctedText = useMemo(() => {
    return calculateCorrectedText(textChecked, result, appliedSuggestions);
  }, [textChecked, result, appliedSuggestions]);

  // Apply an individual suggestion, optionally with a specific replacement
  const applySuggestion = useCallback(
    async (index: number, replacement?: string) => {
      const match = result.matches?.[index];
      if (!match) return;

      const chosen = replacement ?? defaultReplacement(match);

      setAppliedSuggestions((current) => new Map(current).set(index, chosen));

      await showToast({
        style: Toast.Style.Success,
        title: "Suggestion applied",
      });
    },
    [result.matches],
  );

  // Apply all suggestions
  const applyAllSuggestions = useCallback(async () => {
    if (!result.matches) return;

    setAppliedSuggestions(allDefaultCorrections(result));

    await showToast({
      style: Toast.Style.Success,
      title: `Applied ${result.matches.length} suggestions`,
    });
  }, [result]);

  // Apply all and paste
  const applyAllAndPaste = useCallback(async () => {
    const all = allDefaultCorrections(result);
    const fullyCorrectedText = calculateCorrectedText(textChecked, result, all);

    setAppliedSuggestions(all);
    await Clipboard.paste(fullyCorrectedText);

    await showToast({
      style: Toast.Style.Success,
      title: `Applied ${all.size} suggestions and pasted`,
    });
  }, [textChecked, result]);

  // Copy corrected text
  const copyToClipboard = useCallback(async () => {
    await Clipboard.copy(correctedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }, [correctedText]);

  // Paste corrected text
  const pasteText = useCallback(async () => {
    await Clipboard.paste(correctedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Pasted",
    });
  }, [correctedText]);

  // Reset corrections
  const resetCorrections = useCallback(() => {
    setAppliedSuggestions(new Map());
    showToast({
      style: Toast.Style.Success,
      title: "Reset",
    });
  }, []);

  return {
    correctedText,
    appliedSuggestions,
    applySuggestion,
    applyAllSuggestions,
    applyAllAndPaste,
    copyToClipboard,
    pasteText,
    resetCorrections,
  };
}
