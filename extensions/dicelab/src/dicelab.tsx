// Dicelab REPL command

import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  useNavigation,
} from "@raycast/api";
import React, { useState } from "react";
import { getEngine, syncAliasesToStorage } from "./engine";
import { addToHistory } from "./engine/storage";
import type { EvaluateResponse } from "./engine/types";

export default function DicelabCommand() {
  const [expression, setExpression] = useState("");
  const [results, setResults] = useState<
    Array<{ expression: string; result: string }>
  >([]);
  const { push } = useNavigation();

  async function handleSubmit() {
    if (!expression.trim()) {
      return;
    }

    try {
      const engine = await getEngine();
      const evalResult = engine.evaluate(expression);

      let resultText: string;

      if (typeof evalResult === "string") {
        resultText = evalResult;
      } else {
        const response = evalResult as EvaluateResponse;
        resultText = response.result;
      }

      // Add to results
      setResults([...results, { expression, result: resultText }]);

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

      // Clear input for next expression
      setExpression("");

      // Show result in detail view
      const markdown = `# Result\n\n\`\`\`\n${resultText}\n\`\`\`\n\n## Expression\n\`${expression}\``;
      push(<Detail markdown={markdown} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Evaluation Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Evaluate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="expression"
        title="Expression"
        placeholder="d20, 2d6+4, let str = 18, analyze d20adv+5"
        value={expression}
        onChange={setExpression}
      />
      <Form.Description
        text={`Enter a dice expression, variable assignment, or analyze command.

Previous results: ${results.length}`}
      />
    </Form>
  );
}
