import { Detail } from "@raycast/api";
import type { CheckTextResponse } from "../types";
import { useTextCorrections } from "../hooks/use-text-corrections";
import { ResultMetadata } from "./result-metadata";
import { ResultActions } from "./result-actions";
import { filterValidMatches } from "../utils/match-filter";

type CheckTextResultProps = {
  result: CheckTextResponse;
  textChecked: string;
};

export function CheckTextResult({ result, textChecked }: CheckTextResultProps) {
  // Filter out matches with invalid replacements before processing
  const filteredResult = filterValidMatches(result);

  // Hook manages all correction logic
  const {
    correctedText,
    appliedSuggestions,
    applySuggestion,
    applyAllSuggestions,
    applyAllAndPaste,
    copyToClipboard,
    pasteText,
    resetCorrections,
  } = useTextCorrections(textChecked, filteredResult);

  const markdown = `# Corrected Text\n\n${correctedText}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Check Results"
      metadata={
        <ResultMetadata
          result={filteredResult}
          appliedSuggestions={appliedSuggestions}
        />
      }
      actions={
        <ResultActions
          result={filteredResult}
          appliedSuggestions={appliedSuggestions}
          applyAllAndPaste={applyAllAndPaste}
          pasteText={pasteText}
          copyToClipboard={copyToClipboard}
          applyAllSuggestions={applyAllSuggestions}
          resetCorrections={resetCorrections}
          applySuggestion={applySuggestion}
        />
      }
    />
  );
}
