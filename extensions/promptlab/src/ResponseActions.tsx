import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import CommandChatView from "./components/CommandChatView";
import { CommandOptions } from "./utils/types";

export default function ResponseActions(props: {
  commandName: string;
  options: CommandOptions;
  commandSummary: string;
  responseText: string;
  promptText: string;
  reattempt: () => void;
  files?: string[];
  listItem?: string;
  cancel: () => void;
}) {
  const { commandName, commandSummary, options, responseText, promptText, reattempt, files, listItem, cancel } = props;
  return (
    <ActionPanel>
      {listItem?.length ? (
        <ActionPanel.Section title="Item Actions">
          <Action.CopyToClipboard title="Copy Item" content={listItem} />
        </ActionPanel.Section>
      ) : null}
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
        <Action.Push
          title="Open Chat"
          target={
            <CommandChatView
              isLoading={false}
              commandName={commandName}
              options={options}
              prompt={promptText}
              response={responseText}
              revalidate={reattempt}
              cancel={cancel}
              useFiles={options.minNumFiles != undefined && options.minNumFiles > 0 ? true : false}
            />
          }
          icon={Icon.Message}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
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
