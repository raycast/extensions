// PMF Detail view component with SVG charts

import { Detail, ActionPanel, Action } from "@raycast/api";
import React from "react";
import {
  generatePMFBarChart,
  generateCombinedPMFBarChart,
  svgToDataUri,
} from "../utils/svg-chart";
import { normalizePmfPayload, summarizePmfPayload } from "../utils/pmf";
import { buildCombinedChartData } from "../utils/chart-helpers";

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

  // Generate charts - combined for multiple PMFs, simple for single PMF
  let charts: string;

  if (normalized.pmfs.length > 1) {
    // Multiple PMFs - use combined chart
    const chartData = buildCombinedChartData(normalized.pmfs);
    const svg = generateCombinedPMFBarChart(chartData, {
      width: 600,
      height: 300,
      title: `Combined Distribution Analysis (${normalized.pmfs.length} distributions)`,
      showLegend: true,
    });
    const dataUri = svgToDataUri(svg);
    charts = `![Combined PMF Chart](${dataUri}?raycast-width=600&raycast-height=300)`;
  } else {
    // Single PMF - use existing simple chart
    const bins = normalized.pmfs[0].bins.map((bin) => ({
      label: bin.label,
      probability: bin.probability,
    }));
    const svg = generatePMFBarChart(bins, {
      width: 500,
      height: 250,
    });
    const dataUri = svgToDataUri(svg);
    charts = `![PMF Chart](${dataUri}?raycast-width=500&raycast-height=250)`;
  }

  // Build statistics table
  const colorEmojis = ["🔵", "🔴", "🟢", "🟠", "🟣", "🟡", "⚪", "⚫"];
  const stats = normalized.pmfs
    .map((pmfData, index) => {
      const colorEmoji = colorEmojis[index % colorEmojis.length];
      const prefix =
        normalized.pmfs.length > 1
          ? `**${colorEmoji} Distribution #${index + 1}**\n`
          : "";
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
