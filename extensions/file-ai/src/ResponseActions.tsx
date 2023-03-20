import { Action, ActionPanel } from "@raycast/api";

export default function ResponseActions(props: { commandSummary: string; responseText: string; promptText: string }) {
  const { commandSummary, responseText, promptText } = props;
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title={`Copy ${commandSummary} To Clipboard`}
        content={responseText}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        title={`Copy Prompt To Clipboard`}
        content={promptText}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
    </ActionPanel>
  );
}
