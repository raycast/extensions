import { Action, ActionPanel, Color, Detail, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useDiscovery } from "./use-discovery";

import { checkNumber, formatDate } from "./api";

function DiscoveryForm({ initialValue, onSubmit }: { initialValue: string; onSubmit: (next: string) => void }) {
  const [draft, setDraft] = useState(initialValue);
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Discover Number"
            onSubmit={(values: { input: string }) => {
              const next = values.input.trim();
              if (!/^\d+$/.test(next)) return;
              onSubmit(next);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Number"
        value={draft}
        onChange={setDraft}
        error={!/^\d+$/.test(draft.trim()) ? "Please enter a valid number (digits only)" : undefined}
      />
    </Form>
  );
}

export default function Command({ arguments: args }: { arguments: { number: string } }) {
  const [input, setInput] = useState(args.number.trim());
  const { push } = useNavigation();
  const isValid = /^\d+$/.test(input);
  const { state, cancel, retry } = useDiscovery(checkNumber, input, isValid);
  const isLoading = isValid && state.kind === "loading";
  const result = state.kind === "success" ? state.result : undefined;
  const error = !isValid
    ? "Please enter a valid number (digits only)"
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
      <Action title="Discover Another Number" onAction={edit} />
      {isValid && <Action title="Retry Discovery" onAction={retry} />}
    </ActionPanel.Section>
  );

  if (isLoading) {
    return (
      <Detail
        isLoading
        markdown={`# Checking \`${input}\``}
        actions={
          <ActionPanel>
            <Action title="Cancel Discovery" onAction={cancel} />
            <Action title="Discover Another Number" onAction={edit} />
          </ActionPanel>
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
          {discoveryActions}
          <Action.CopyToClipboard title="Copy Number" content={result.number} />
          <Action.OpenInBrowser url="https://numberresearch.xyz" />
        </ActionPanel>
      }
    />
  );
}
