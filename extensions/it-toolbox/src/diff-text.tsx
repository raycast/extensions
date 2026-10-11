import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DiffLine, diffLines, diffStats } from "./utils/toolbox";

export default function Command() {
  const { push } = useNavigation();
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Compare"
            icon={Icon.ArrowRight}
            onSubmit={(values: { left?: string; right?: string }) => {
              try {
                const lines = diffLines(values.left ?? "", values.right ?? "", ignoreCase, ignoreWhitespace);
                push(<DiffResult lines={lines} />);
              } catch (error) {
                // diffLines refuses inputs whose LCS table would be too large to build safely.
                showToast({ style: Toast.Style.Failure, title: "Cannot compare", message: (error as Error).message });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="left" title="Original Text" placeholder="Paste the original version" enableMarkdown={false} />
      <Form.TextArea id="right" title="Modified Text" placeholder="Paste the new version" enableMarkdown={false} />
      <Form.Checkbox id="ignoreCase" label="Ignore Case" value={ignoreCase} onChange={setIgnoreCase} />
      <Form.Checkbox
        id="ignoreWhitespace"
        label="Ignore Whitespace"
        value={ignoreWhitespace}
        onChange={setIgnoreWhitespace}
      />
    </Form>
  );
}

function DiffResult({ lines }: { lines: DiffLine[] }) {
  const stats = diffStats(lines);
  const markdown = [
    `Added **${stats.added}** · Removed **${stats.removed}** · Unchanged ${stats.unchanged} lines`,
    "",
    "```diff",
    ...lines.map((line) => {
      if (line.type === "add") return `+ ${line.value}`;
      if (line.type === "remove") return `- ${line.value}`;
      return `  ${line.value}`;
    }),
    "```",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Added" text={String(stats.added)} icon={Icon.Check} />
          <Detail.Metadata.Label title="Removed" text={String(stats.removed)} icon={Icon.Minus} />
          <Detail.Metadata.Label title="Unchanged" text={String(stats.unchanged)} icon={Icon.Minus} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Diff"
            content={lines
              .map((l) => `${l.type === "add" ? "+" : l.type === "remove" ? "-" : " "} ${l.value}`)
              .join("\n")}
          />
        </ActionPanel>
      }
    />
  );
}
