import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";

export default function ResponseActions(props: {
  commandSummary: string;
  responseText: string;
  promptText: string;
  reattempt: () => void;
  files?: string[];
}) {
  const { commandSummary, responseText, promptText, reattempt, files } = props;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Prompt Actions">
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
        <Action
          title="Regenerate"
          onAction={reattempt}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="File Actions">
        {files?.map((file, index) => (
          <Action.Open
            title={`Open ${file.split("/").at(-1)}`}
            target={file}
            shortcut={{ modifiers: ["cmd", "shift"], key: (index + 1).toString() as Keyboard.KeyEquivalent }}
            key={file}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
