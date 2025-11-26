import { useState, useMemo, useCallback } from "react";
import { Clipboard, showToast, Toast } from "@raycast/api";
import type { CheckTextResponse } from "../types";
import { calculateCorrectedText } from "../utils/text-correction";

/**
 * Hook para gerenciar correções de texto
 */
export function useTextCorrections(textChecked: string, result: CheckTextResponse) {
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  // Texto corrigido atual
  const correctedText = useMemo(() => {
    return calculateCorrectedText(textChecked, result, appliedSuggestions);
  }, [textChecked, result, appliedSuggestions]);

  // Aplica uma sugestão individual
  const applySuggestion = useCallback(
    async (index: number) => {
      const newApplied = new Set(appliedSuggestions);
      newApplied.add(index);
      setAppliedSuggestions(newApplied);

      await showToast({
        style: Toast.Style.Success,
        title: "Suggestion applied",
      });
    },
    [appliedSuggestions],
  );

  // Aplica todas as sugestões
  const applyAllSuggestions = useCallback(async () => {
    if (!result.matches) return;

    const allIndexes = new Set(result.matches.map((_, index) => index));
    setAppliedSuggestions(allIndexes);

    await showToast({
      style: Toast.Style.Success,
      title: `Applied ${result.matches.length} suggestions`,
    });
  }, [result.matches]);

  // Aplica todas e cola
  const applyAllAndPaste = useCallback(async () => {
    const allIndexes = new Set(result.matches?.map((_, index) => index) || []);
    const fullyCorrectedText = calculateCorrectedText(textChecked, result, allIndexes);

    setAppliedSuggestions(allIndexes);
    await Clipboard.paste(fullyCorrectedText);

    await showToast({
      style: Toast.Style.Success,
      title: `Applied ${allIndexes.size} suggestions and pasted`,
    });
  }, [textChecked, result]);

  // Copia texto corrigido
  const copyToClipboard = useCallback(async () => {
    await Clipboard.copy(correctedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }, [correctedText]);

  // Cola texto corrigido
  const pasteText = useCallback(async () => {
    await Clipboard.paste(correctedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Pasted",
    });
  }, [correctedText]);

  // Reseta correções
  const resetCorrections = useCallback(() => {
    setAppliedSuggestions(new Set());
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
