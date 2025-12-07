// Dicelab REPL command
// Handles both regular rolls and analyze commands

import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  LaunchProps,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  evaluateExpression,
  createDetailView,
  type EvaluationResult,
} from "./utils/evaluation";

interface Arguments {
  expression?: string;
}

export default function DicelabCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const expressionArg = props.arguments.expression;

  // If expression argument provided, evaluate it directly
  if (expressionArg) {
    return <DirectEvaluate expression={expressionArg} />;
  }

  // Otherwise, show REPL form
  return <REPLForm />;
}

// Direct evaluation component (when expression argument is provided)
function DirectEvaluate({ expression }: { expression: string }) {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function evaluate() {
      const evalResult = await evaluateExpression(expression);
      setResult(evalResult);
      setIsLoading(false);
    }
    evaluate();
  }, [expression]);

  if (isLoading) {
    return <Detail isLoading markdown="Evaluating..." />;
  }

  if (!result) {
    return <Detail markdown="# Error\n\nNo result available." />;
  }

  return createDetailView(result);
}

// REPL form component (when no expression argument)
function REPLForm() {
  const [expression, setExpression] = useState("");
  const [results, setResults] = useState<
    Array<{ expression: string; result: string }>
  >([]);
  const { push } = useNavigation();

  async function handleSubmit() {
    if (!expression.trim()) {
      return;
    }

    // Store current expression before clearing
    const currentExpression = expression;

    // Clear input for next expression
    setExpression("");

    // Evaluate using shared utility
    const evalResult = await evaluateExpression(currentExpression);

    // Add to results history (even if error)
    setResults([
      ...results,
      { expression: currentExpression, result: evalResult.result },
    ]);

    // Push appropriate detail view (PMF or standard)
    push(createDetailView(evalResult));
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
