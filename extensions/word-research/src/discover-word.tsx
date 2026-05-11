import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { checkWord, formatDate } from "./api";

export default function Command({ arguments: args }: { arguments: Arguments.DiscoverWord }) {
  const input = args.word.trim();
  // Allow Unicode letters, hyphens, and apostrophes to support words like "café", "co-operate", "it's"
  const isValid = /^[\p{L}'-]+$/u.test(input);
  const {
    data: result,
    isLoading,
    error: fetchError,
  } = usePromise(checkWord, [input], {
    execute: isValid,
  });

  const error = !isValid ? "Please enter a valid word (letters, hyphens, and apostrophes only)" : fetchError?.message;

  if (isLoading) {
    return (
      <Detail
        isLoading
        markdown={`# Checking \`${input}\`\n\nSolving proof-of-work, then looking up this word in Word Research.`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Word" text={input} />
            <Detail.Metadata.Label title="Status" text="Computing…" />
          </Detail.Metadata>
        }
      />
    );
  }

  if (error || !result) {
    return (
      <Detail
        markdown={`# Error\n\n${error ?? "Something went wrong."}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Word Research" url="https://wordresearch.xyz" />
          </ActionPanel>
        }
      />
    );
  }

  const dictionaryUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(result.word)}`;
  const markdown = result.is_new
    ? [
        "# New Word Discovered!",
        "",
        `You are the **first** person to discover **${result.word}**.`,
        "",
        "| | |",
        "|---|---|",
        `| **Word** | \`${result.word}\` |`,
        "| **Status** | New Discovery |",
        `| **Discovered** | ${formatDate(result.discovered_at)} |`,
        `| **Searches** | ${result.search_count.toLocaleString()} |`,
      ].join("\n")
    : [
        `# ${result.word}`,
        "",
        "This word has already been discovered.",
        "",
        "| | |",
        "|---|---|",
        `| **Word** | \`${result.word}\` |`,
        "| **Status** | Already Known |",
        `| **Discovered** | ${formatDate(result.discovered_at)} |`,
        `| **Searches** | ${result.search_count.toLocaleString()} |`,
      ].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Word" text={result.word} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={result.is_new ? "New Discovery" : "Already Known"}
              color={result.is_new ? Color.Green : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Searches" text={result.search_count.toLocaleString()} />
          <Detail.Metadata.Label title="Discovered" text={formatDate(result.discovered_at)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Website" target="https://wordresearch.xyz" text="wordresearch.xyz" />
          <Detail.Metadata.Link title="Dictionary" target={dictionaryUrl} text="View in Wiktionary" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Word" content={result.word} />
          <Action.OpenInBrowser title="Open Word Research" url="https://wordresearch.xyz" />
          <Action.OpenInBrowser title="Open in Wiktionary" url={dictionaryUrl} />
        </ActionPanel>
      }
    />
  );
}
