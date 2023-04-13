import { Action, ActionPanel, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";

export default function ResponseActions(props: {
  commandSummary: string;
  responseText: string;
  promptText: string;
  reattempt: () => void;
  files?: string[];
  listItem?: string;
}) {
  const { commandSummary, responseText, promptText, reattempt, files, listItem } = props;
  return (
    <ActionPanel>
      {listItem?.length ? <ActionPanel.Section title="Item Actions">
        <Action.CopyToClipboard title="Copy Item" content={listItem} />
      </ActionPanel.Section> : null}
      <ActionPanel.Section title="Prompt Actions">
        <Action.CopyToClipboard
          title={`Copy ${commandSummary} To Clipboard`}
          content={responseText}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
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
        <Action
          title="Open Chat"
          onAction={() => {
            launchCommand({
              name: "chat",
              arguments: {
                initialQuery: `Your last response: "${responseText}" {Summarize your last response.}`,
              },
              type: LaunchType.UserInitiated,
            });
          }}
          icon={Icon.Message}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
