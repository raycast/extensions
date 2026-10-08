import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { checkNumber, formatDate } from "./api";

export default function Command({ arguments: args }: { arguments: { number: string } }) {
  const input = args.number.trim();
  const isValid = /^\d+$/.test(input);
  const {
    data: result,
    isLoading,
    error: fetchError,
  } = usePromise(checkNumber, [input], {
    execute: isValid,
  });

  const error = !isValid ? "Please enter a valid number (digits only)" : fetchError?.message;

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
