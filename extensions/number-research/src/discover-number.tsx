import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { CheckResult, checkNumber, formatDate } from "./api";

export default function Command({ arguments: args }: { arguments: { number: string } }) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const input = args.number.trim();

  useEffect(() => {
    if (!/^\d+$/.test(input)) {
      setError("Please enter a valid number (digits only)");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    checkNumber(input, controller.signal)
      .then((data) => {
        setResult(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [input]);

  if (isLoading) {
    return <Detail isLoading markdown="" />;
  }

  if (error || !result) {
    return (
      <Detail
        markdown={`# Error\n\n${error ?? "Something went wrong."}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://numberresearch.xyz" />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = result.is_new
    ? [
        `# New Number Discovered!`,
        ``,
        `You are the **first** person to discover **${result.number}**.`,
        ``,
        `| | |`,
        `|---|---|`,
        `| **Number** | \`${result.number}\` |`,
        `| **Status** | New Discovery |`,
        `| **Discovered** | ${formatDate(result.discovered_at)} |`,
        `| **Searches** | ${result.search_count.toLocaleString()} |`,
      ].join("\n")
    : [
        `# ${result.number}`,
        ``,
        `This number has already been discovered.`,
        ``,
        `| | |`,
        `|---|---|`,
        `| **Number** | \`${result.number}\` |`,
        `| **Status** | Already Known |`,
        `| **Discovered** | ${formatDate(result.discovered_at)} |`,
        `| **Searches** | ${result.search_count.toLocaleString()} |`,
      ].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Number" text={result.number} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={result.is_new ? "New Discovery" : "Already Known"}
              color={result.is_new ? Color.Green : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Searches" text={result.search_count.toLocaleString()} />
          <Detail.Metadata.Label title="Discovered" text={formatDate(result.discovered_at)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Website" target="https://numberresearch.xyz" text="numberresearch.xyz" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Number" content={result.number} />
          <Action.OpenInBrowser url="https://numberresearch.xyz" />
        </ActionPanel>
      }
    />
  );
}
