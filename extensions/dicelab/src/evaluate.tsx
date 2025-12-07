// Universal Evaluate Command - handles both regular rolls and analyze commands
// Replaces the separate roll.tsx and analyze.tsx commands

import { Detail, LaunchProps } from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  evaluateExpression,
  createDetailView,
  type EvaluationResult,
} from "./utils/evaluation";

interface Arguments {
  expression: string;
}

export default function EvaluateCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { expression } = props.arguments;
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
