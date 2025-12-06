// Roll Dice command - main expression evaluation

import { Detail, LaunchProps, ActionPanel, Action } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getEngine, syncAliasesToStorage } from "./engine";
import { addToHistory } from "./engine/storage";
import type { EvaluateResponse } from "./engine/types";
import { PMFDetail } from "./components/PMFDetail";

interface Arguments {
  expression: string;
}

export default function RollCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { expression } = props.arguments;
  const [result, setResult] = useState<string>("");
  const [pmf, setPmf] = useState<EvaluateResponse["pmf"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPmf, setShowPmf] = useState(false);

  useEffect(() => {
    async function evaluate() {
      try {
        const engine = await getEngine();
        const evalResult = engine.evaluate(expression);

        let resultText: string;
        let pmfData: EvaluateResponse["pmf"] | null = null;

        if (typeof evalResult === "string") {
          resultText = evalResult;
        } else {
          const response = evalResult as EvaluateResponse;
          resultText = response.result;
          pmfData = response.pmf;
        }

        setResult(resultText);
        setPmf(pmfData);

        // Save to history
        await addToHistory({
          expression,
          result: resultText,
          timestamp: Date.now(),
        });

        // Sync aliases if this was a let command
        if (expression.trim().toLowerCase().startsWith("let ")) {
          await syncAliasesToStorage();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Evaluation failed");
      } finally {
        setIsLoading(false);
      }
    }
    evaluate();
  }, [expression]);

  if (isLoading) {
    return <Detail isLoading markdown="Rolling dice..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\n## Expression\n\`${expression}\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={error} />
          </ActionPanel>
        }
      />
    );
  }

  if (showPmf && pmf) {
    return <PMFDetail expression={expression} pmf={pmf} />;
  }

  const hasPmf = pmf != null;

  const markdown = `# Result

\`\`\`
${result}
\`\`\`

## Expression
\`${expression}\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action.CopyToClipboard
            title="Copy Expression"
            content={expression}
          />
          {hasPmf && (
            <Action title="View Pmf Chart" onAction={() => setShowPmf(true)} />
          )}
        </ActionPanel>
      }
    />
  );
}
