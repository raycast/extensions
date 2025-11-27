import { Detail } from "@raycast/api";
import type { CheckTextResponse } from "../types";
import { useTextCorrections } from "../hooks/use-text-corrections";
import { ResultMetadata } from "./result-metadata";
import { ResultActions } from "./result-actions";

type CheckTextResultProps = {
  result: CheckTextResponse;
  textChecked: string;
};

export function CheckTextResult({ result, textChecked }: CheckTextResultProps) {
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
  } = useTextCorrections(textChecked, result);

  const markdown = `# Corrected Text\n\n${correctedText}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Check Results"
      metadata={
        <ResultMetadata
          result={result}
          appliedSuggestions={appliedSuggestions}
        />
      }
      actions={
        <ResultActions
          result={result}
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
