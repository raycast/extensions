import { Action, ActionPanel, Color, Detail, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useDiscovery } from "./use-discovery";

import { checkWord, formatDate } from "./api";

function DiscoveryForm({ initialValue, onSubmit }: { initialValue: string; onSubmit: (next: string) => void }) {
  const [draft, setDraft] = useState(initialValue);
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Discover Word"
            onSubmit={(values: { input: string }) => {
              const next = values.input.trim();
              if (!/^[\p{L}'-]+$/u.test(next)) return;
              onSubmit(next);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Word"
        value={draft}
        onChange={setDraft}
        error={
          !/^[\p{L}'-]+$/u.test(draft.trim())
            ? "Please enter a valid word (letters, hyphens, and apostrophes only)"
            : undefined
        }
      />
    </Form>
  );
}

export default function Command({ arguments: args }: { arguments: Arguments.DiscoverWord }) {
  const [input, setInput] = useState(args.word.trim());
  const { push } = useNavigation();
  const isValid = /^[\p{L}'-]+$/u.test(input);
  const { state, cancel, retry } = useDiscovery(checkWord, input, isValid);
  const isLoading = isValid && state.kind === "loading";
  const result = state.kind === "success" ? state.result : undefined;
  const error = !isValid
    ? "Please enter a valid word (letters, hyphens, and apostrophes only)"
    : state.kind === "error"
      ? state.message
      : undefined;
  const edit = () => {
    if (isLoading) cancel();
    push(
      <DiscoveryForm
        initialValue={input}
        onSubmit={(next) => {
          setInput(next);
          retry();
        }}
      />,
    );
  };
  const discoveryActions = (
    <ActionPanel.Section>
      <Action title="Discover Another Word" onAction={edit} />
      {isValid && <Action title="Retry Discovery" onAction={retry} />}
    </ActionPanel.Section>
  );

  if (isLoading) {
    return (
      <Detail
        isLoading
        actions={
          <ActionPanel>
            <Action title="Cancel Discovery" onAction={cancel} />
            <Action title="Discover Another Word" onAction={edit} />
          </ActionPanel>
        }
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
        markdown={
          state.kind === "cancelled" ? "# Discovery Cancelled" : `# Error\n\n${error ?? "Something went wrong."}`
        }
        actions={
          <ActionPanel>
            {discoveryActions}
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
          {discoveryActions}
          <Action.CopyToClipboard title="Copy Word" content={result.word} />
          <Action.OpenInBrowser title="Open Word Research" url="https://wordresearch.xyz" />
          <Action.OpenInBrowser title="Open in Wiktionary" url={dictionaryUrl} />
        </ActionPanel>
      }
    />
  );
}
