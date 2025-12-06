// Analyze Expression command - PMF chart visualization

import { Detail, LaunchProps } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getEngine } from "./engine";
import type { EvaluateResponse } from "./engine/types";
import { PMFDetail } from "./components/PMFDetail";

interface Arguments {
  expression: string;
}

export default function AnalyzeCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { expression } = props.arguments;
  const [pmf, setPmf] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function analyze() {
      try {
        const engine = await getEngine();
        // Prepend "analyze" if not already present
        const query = expression.trim().toLowerCase().startsWith("analyze")
          ? expression
          : `analyze ${expression}`;
        const evalResult = engine.evaluate(query);

        let pmfData: unknown = null;

        if (typeof evalResult === "string") {
          setError("No probability data returned");
        } else {
          const response = evalResult as EvaluateResponse;
          if (response.pmf) {
            pmfData = response.pmf;
            setPmf(pmfData);
          } else {
            setError("No probability data returned");
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setIsLoading(false);
      }
    }
    analyze();
  }, [expression]);

  if (isLoading) {
    return <Detail isLoading markdown="Analyzing expression..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\n## Expression\n\`${expression}\``}
      />
    );
  }

  return <PMFDetail expression={expression} pmf={pmf} />;
}
