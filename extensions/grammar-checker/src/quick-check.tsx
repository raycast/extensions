import React, { useEffect, useState, useCallback } from "react";
import {
  getSelectedText,
  showToast,
  Toast,
  Detail,
  Action,
  ActionPanel,
  Icon,
} from "@raycast/api";
import { createProvider } from "./providers";
import { HistoryManager } from "./history";
import AnalysisView from "./analysis-view";
import { CheckResult } from "./api";

export default function QuickCheck() {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    // Reset state for fresh check
    setIsLoading(true);
    setResult(null);
    setError(null);
    setOriginalText("");

    try {
      const selectedText = await getSelectedText();
      const textToCheck = selectedText.trim();

      if (!textToCheck) {
        setError("No text selected. Please select some text and try again.");
        setIsLoading(false);
        return;
      }

      setOriginalText(textToCheck);
      await showToast(Toast.Style.Animated, "Checking grammar...");

      const provider = createProvider();

      // Quick check uses casual style by default for lighter corrections
      const checkResult = await provider.analyzeText(textToCheck, "casual");

      await HistoryManager.saveCheck(
        textToCheck,
        checkResult.corrected,
        checkResult.issues,
      );

      setResult(checkResult);
      await showToast(
        Toast.Style.Success,
        `Found ${checkResult.issues.length} issue(s)`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Unable to get selected text")) {
        setError("Please select some text first, then try again.");
      } else {
        setError(`Failed to check grammar: ${errorMessage}`);
      }
      await showToast(Toast.Style.Failure, "Failed to check grammar");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.Redo} onAction={runCheck} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <Detail isLoading={true} markdown="Analyzing your text for issues..." />
    );
  }

  if (!result) {
    return <Detail markdown="# Error\n\nNo result received." />;
  }

  return <AnalysisView result={result} originalText={originalText} />;
}
