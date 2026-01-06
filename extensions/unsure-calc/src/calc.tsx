import { Action, ActionPanel, Clipboard, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

// Thin TypeScript wrapper that re-exports the shared JS core for Raycast.
// The logic lives in unsure-calc-core (../core/calc-core.js) so browser, tests, and Raycast share one implementation.

import {
  tokenize,
  shuntingYard,
  evalRpn,
  evaluateExpression,
  getQuantiles,
  formatNumber,
  generateTextHistogram,
  DEFAULT_SAMPLES,
  DEFAULT_BINS,
  DEFAULT_WIDTH,
  DEFAULT_BAR,
} from "./core/calc-core";

export type UncertainValue = {
  mean: number;
  min: number;
  max: number;
  samples: number[] | null;
};

export type Quantiles = { p05: number; p95: number };

export type HistogramOptions = {
  bins?: number;
  width?: number;
  barChar?: string;
};

export {
  tokenize,
  shuntingYard,
  evalRpn,
  evaluateExpression,
  getQuantiles,
  formatNumber,
  generateTextHistogram,
  DEFAULT_SAMPLES,
  DEFAULT_BINS,
  DEFAULT_WIDTH,
  DEFAULT_BAR,
};

const parseIntPreference = (value: string | undefined, fallback: number, min = 1) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

interface CommandProps {
  arguments?: {
    expression?: string;
  };
}

const introMarkdown = `# UnSure Calculator

Use '~' to enter ranges. Examples:
- 7 ~ 10 * 17 ~ 23
- (100 ~ 130)/(2 ~ 4)
- -2^2

You will see exact bounds plus a simulated 5%-95% range and histogram.`;

export default function Command(props: CommandProps) {
  const prefs = getPreferenceValues<Preferences.Calc>();
  const initialExpression = props.arguments?.expression ?? "";
  const sampleCount = parseIntPreference(prefs.samples, DEFAULT_SAMPLES);
  const histogramBins = parseIntPreference(prefs.histogramBins, DEFAULT_BINS);
  const histogramWidth = parseIntPreference(prefs.histogramWidth, DEFAULT_WIDTH);
  const barChar = (prefs.barChar ?? DEFAULT_BAR).slice(0, 1) || DEFAULT_BAR;
  const [expression, setExpression] = useState(initialExpression);
  const [markdown, setMarkdown] = useState(introMarkdown);
  const [isLoading, setIsLoading] = useState(false);
  const [subtitle, setSubtitle] = useState<string | undefined>();
  const [copyText, setCopyText] = useState<string>(introMarkdown);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!expression.trim()) {
        setMarkdown(introMarkdown);
        setSubtitle(undefined);
        setCopyText(introMarkdown);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = evaluateExpression(expression, sampleCount);
        if (!result) {
          setMarkdown(`Nothing to compute for \`${expression}\`.`);
          setSubtitle(undefined);
          setCopyText(expression);
          setError(null);
          setIsLoading(false);
          return;
        }

        if (isNaN(result.mean) || isNaN(result.min) || isNaN(result.max)) {
          throw new Error("Result contains NaN (likely from dividing by zero)");
        }

        const quantiles = result.samples ? getQuantiles(result.samples) : null;
        const histogramLines = result.samples
          ? generateTextHistogram(result.samples, {
              bins: histogramBins,
              width: histogramWidth,
              barChar,
            })
          : [];

        const summaryParts = [
          `avg ${formatNumber(result.mean)}`,
          `range ${formatNumber(result.min)}-${formatNumber(result.max)}`,
        ];
        if (quantiles && !isNaN(quantiles.p05) && !isNaN(quantiles.p95)) {
          summaryParts.push(`sim ${formatNumber(quantiles.p05)}~${formatNumber(quantiles.p95)}`);
        }
        const summary = summaryParts.join(" | ");

        const tableRows = [
          "| Metric | Value |",
          "| --- | --- |",
          `| Exact average | ${formatNumber(result.mean)} |`,
          `| Exact range | ${formatNumber(result.min)} - ${formatNumber(result.max)} |`,
        ];
        if (quantiles) {
          if (isNaN(quantiles.p05) || isNaN(quantiles.p95)) {
            tableRows.push("| Simulated 5%-95% | NaN or Infinity detected |");
          } else {
            tableRows.push(`| Simulated 5%-95% | ${formatNumber(quantiles.p05)} ~ ${formatNumber(quantiles.p95)} |`);
          }
        } else {
          tableRows.push("| Simulated 5%-95% | exact number (no simulation) |");
        }

        const histogramBlock = histogramLines.length
          ? `\n**Histogram (higher values at top)**\n\n\`\`\`\n${histogramLines.join("\n")}\n\`\`\``
          : "";

        const md = ["# UnSure Calculator", `Expression: \`${expression}\``, "", tableRows.join("\n"), histogramBlock]
          .filter(Boolean)
          .join("\n");

        if (!cancelled) {
          setMarkdown(md);
          setSubtitle(summary);
          setCopyText([`Expression: ${expression}`, ...tableRows].join("\n"));
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setMarkdown(
          `**Expression:** \`${expression}\`\n\n**Error:** ${message}\n\n- Use digits, + - * / ^ and ~ for ranges.\n- Parentheses are supported.`,
        );
        setSubtitle(undefined);
        setCopyText(message);
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expression, sampleCount, histogramBins, histogramWidth, barChar]);

  return (
    <List
      searchText={expression}
      onSearchTextChange={setExpression}
      searchBarPlaceholder="Use ~ for ranges, e.g., 7~10 * 17~23"
      isShowingDetail
      isLoading={isLoading}
    >
      <List.Item
        title={expression || "Start typing an expression"}
        subtitle={error ? `Error: ${error}` : subtitle}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Summary" content={copyText} />
            <Action
              title="Clear"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => setExpression("")}
            />
            <Action
              title="Paste Expression"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
              onAction={async () => {
                const fromClipboard = await Clipboard.readText();
                if (fromClipboard) setExpression(fromClipboard.trim());
                else await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
