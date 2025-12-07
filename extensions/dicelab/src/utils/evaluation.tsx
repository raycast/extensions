// Shared evaluation utility for Dicelab Raycast extension
// Centralizes evaluation logic, PMF detection, and result rendering

import { Detail, ActionPanel, Action } from "@raycast/api";
import React from "react";
import { getEngine, syncAliasesToStorage } from "../engine";
import { addToHistory } from "../engine/storage";
import type { EvaluateResponse } from "../engine/types";
import { PMFDetail } from "../components/PMFDetail";

export interface EvaluationResult {
  expression: string;
  result: string;
  pmf: unknown | null;
  error: string | null;
}

/**
 * Evaluates a dice expression using the Dicelab engine
 * Handles both string and object responses, saves to history, and syncs aliases
 */
export async function evaluateExpression(
  expression: string,
): Promise<EvaluationResult> {
  try {
    const engine = await getEngine();
    const evalResult = engine.evaluate(expression);

    let resultText: string;
    let pmfData: unknown | null = null;

    if (typeof evalResult === "string") {
      resultText = evalResult;
    } else {
      const response = evalResult as EvaluateResponse;
      resultText = response.result;
      pmfData = response.pmf ?? null;
    }

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

    return {
      expression,
      result: resultText,
      pmf: pmfData,
      error: null,
    };
  } catch (e) {
    return {
      expression,
      result: "",
      pmf: null,
      error: e instanceof Error ? e.message : "Evaluation failed",
    };
  }
}

/**
 * Determines if PMF data should be displayed
 */
export function shouldShowPMF(evalResult: EvaluationResult): boolean {
  return evalResult.pmf != null && evalResult.error == null;
}

/**
 * Creates appropriate Detail view based on evaluation result
 * Shows PMFDetail if PMF data is available, otherwise shows standard Detail
 */
export function createDetailView(
  evalResult: EvaluationResult,
  additionalActions?: React.ReactNode,
): React.ReactElement {
  // Error case
  if (evalResult.error) {
    return (
      <Detail
        markdown={`# Error\n\n${evalResult.error}\n\n## Expression\n\`${evalResult.expression}\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Error"
              content={evalResult.error}
            />
            {additionalActions}
          </ActionPanel>
        }
      />
    );
  }

  // PMF case - show probability visualization
  if (shouldShowPMF(evalResult)) {
    return (
      <PMFDetail expression={evalResult.expression} pmf={evalResult.pmf} />
    );
  }

  // Standard result case
  const markdown = `# Result

\`\`\`
${evalResult.result}
\`\`\`

## Expression
\`${evalResult.expression}\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={evalResult.result}
          />
          <Action.CopyToClipboard
            title="Copy Expression"
            content={evalResult.expression}
          />
          {additionalActions}
        </ActionPanel>
      }
    />
  );
}
