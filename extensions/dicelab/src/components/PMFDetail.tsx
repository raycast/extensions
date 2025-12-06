// PMF Detail view component with SVG charts

import { Detail, ActionPanel, Action } from "@raycast/api";
import React from "react";
import { generatePMFBarChart, svgToDataUri } from "../utils/svg-chart";
import { normalizePmfPayload, summarizePmfPayload } from "../utils/pmf";

interface PMFDetailProps {
  expression: string;
  pmf: unknown;
}

export function PMFDetail({ expression, pmf }: PMFDetailProps) {
  const normalized = normalizePmfPayload(pmf);
  const summary = summarizePmfPayload(pmf);

  if (!normalized.pmfs.length) {
    return (
      <Detail markdown={`# ${expression}\n\nNo probability data available.`} />
    );
  }

  // Generate charts for each PMF (usually 1, but analyze can have multiple)
  const charts = normalized.pmfs
    .map((pmfData, index) => {
      const bins = pmfData.bins.map((bin) => ({
        label: bin.label,
        probability: bin.probability,
      }));

      const svg = generatePMFBarChart(bins, {
        width: 500,
        height: 250,
        title:
          normalized.pmfs.length > 1 ? `Distribution #${index + 1}` : undefined,
      });

      const dataUri = svgToDataUri(svg);
      return `![PMF Chart](${dataUri}?raycast-width=500&raycast-height=250)`;
    })
    .join("\n\n");

  // Build statistics table
  const stats = normalized.pmfs
    .map((pmfData, index) => {
      const prefix =
        normalized.pmfs.length > 1 ? `**Distribution #${index + 1}**\n` : "";
      const minLabel = pmfData.bins[0]?.label ?? "?";
      const maxLabel = pmfData.bins[pmfData.bins.length - 1]?.label ?? "?";
      return `${prefix}| Statistic | Value |
|-----------|-------|
| Mean | ${pmfData.mean?.toFixed(2) ?? "?"} |
| Std Dev | ${pmfData.stdDev?.toFixed(2) ?? "?"} |
| Variance | ${pmfData.variance?.toFixed(2) ?? "?"} |
| IQR | ${pmfData.iqr?.toFixed(2) ?? "?"} |
| Range | ${minLabel} - ${maxLabel} |`;
    })
    .join("\n\n");

  const markdown = `# Probability Analysis

## Expression
\`${expression}\`

## Distribution
${charts}

## Statistics
${stats}

---
*${summary}*
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={summary} />
          <Action.CopyToClipboard
            title="Copy Expression"
            content={expression}
          />
        </ActionPanel>
      }
    />
  );
}
