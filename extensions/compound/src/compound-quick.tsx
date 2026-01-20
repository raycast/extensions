import { LaunchProps, getPreferenceValues, Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import type { Params, Result } from "./types";
import { parseQuickInput } from "./parse";
import { calcCompound } from "./calc";
import { toMarkdown, toClipboardText, toCSV } from "./format";

interface Arguments {
  query: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [result, setResult] = useState<{ params: Params; result: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = props.arguments.query?.trim();
    if (!query) {
      setError(null);
      setResult(null);
      return;
    }

    try {
      const params = parseQuickInput(query, preferences);
      const calcResult = calcCompound(params);
      setResult({ params, result: calcResult });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setResult(null);
    }
  }, [props.arguments.query]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="New Calculation"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setError(null);
                setResult(null);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (result) {
    const markdown = toMarkdown(result.result, result.params);

    const freqLabel =
      result.params.freq === "yearly" ? "Yearly" : result.params.freq === "monthly" ? "Monthly" : "Daily";

    const roundingLabel =
      result.params.rounding === "floor"
        ? "Floor"
        : result.params.rounding === "round"
          ? "Round"
          : "Ceiling";

    const periodText =
      result.result.months < 12 ? `${result.result.months} months` : `${result.result.months / 12} years`;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Principal" text={result.params.principal.toLocaleString()} />
            <Detail.Metadata.Label title="Rate" text={`${result.params.ratePct}%`} />
            <Detail.Metadata.Label title="Period" text={periodText} />
            {result.params.monthly > 0 && (
              <Detail.Metadata.Label title="Monthly" text={result.params.monthly.toLocaleString()} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Frequency" text={freqLabel} />
            {result.params.taxRatePct > 0 && (
              <Detail.Metadata.Label title="Tax Rate" text={`${result.params.taxRatePct}%`} />
            )}
            <Detail.Metadata.Label title="Currency" text={result.params.currency} />
            <Detail.Metadata.Label title="Rounding" text={roundingLabel} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="New Calculation"
              icon={Icon.ArrowClockwise}
              onAction={() => setResult(null)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              title="Copy Result (Text)"
              content={toClipboardText(result.result, result.params)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Result (Markdown)"
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Result (CSV)"
              content={toCSV(result.result, result.params)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
            <Action.Paste
              title="Paste Result"
              content={toClipboardText(result.result, result.params)}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`## Input Format

| Pattern | Example |
|---------|---------|
| rate years | \`5% 10y\` |
| principal rate years | \`$10,000 5% 10y\` |
| principal rate years monthly | \`$10,000 5% 10y $500\` |
| principal rate years monthly tax | \`$10,000 5% 10y $500 20%\` |

### Supported Formats
- **Years**: \`10y\`, \`10years\`, \`10年\`
- **Months**: \`6m\`, \`6months\`, \`6ヶ月\`
- **Money**: \`100000\`, \`100,000\`, \`$100\`, \`¥1000\`, \`10万円\`
- **Key-value**: \`p=10000 r=5 y=10 m=500 tax=20\``}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Examples" text="" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Rate and years" text="5% 10y" />
          <Detail.Metadata.Label title="Principal only" text="$10,000 5% 10y" />
          <Detail.Metadata.Label title="With monthly" text="$10,000 5% 10years $500" />
          <Detail.Metadata.Label title="With tax" text="$10,000 5% 10y $500 20%" />
          <Detail.Metadata.Label title="Key-value" text="p=10000 r=5 y=10 m=500 tax=20" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Example: Rate and years" content="5% 10y" />
          <Action.CopyToClipboard title="Copy Example: Principal only" content="$10,000 5% 10y" />
          <Action.CopyToClipboard title="Copy Example: With monthly" content="$10,000 5% 10years $500" />
          <Action.CopyToClipboard title="Copy Example: With tax" content="$10,000 5% 10y $500 20%" />
          <Action.CopyToClipboard title="Copy Example: Key-value" content="p=10000 r=5 y=10 m=500 tax=20" />
        </ActionPanel>
      }
    />
  );
}
