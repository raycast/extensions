import { Detail, ActionPanel, Action, popToRoot } from "@raycast/api";

interface Props {
  title: string;
  content: string;
}

export function ResultView({ title, content }: Props) {
  return (
    <Detail
      markdown={`# ${title}\n\n${content}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={content} title="Copy to Clipboard" onCopy={() => popToRoot()} />
          <Action title="Close" onAction={popToRoot} shortcut={{ modifiers: ["cmd"], key: "w" }} />
        </ActionPanel>
      }
    />
  );
}
