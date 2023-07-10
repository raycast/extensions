import { Action, ActionPanel, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import CommandChatView from "./components/CommandChatView";
import { CommandOptions, ExtensionPreferences } from "./utils/types";
import { getMenubarOwningApplicationSync } from "./utils/context-utils";

/**
 * A command action that pastes the provided text into the current application.
 * @param props.content The text to paste.
 * @param props.commandSummary The summary of the command that is being pasted.
 * @returns A Paste action component.
 */
function PasteAction(props: { content: string; commandSummary: string }) {
  const { content, commandSummary } = props;
  const currentApp = getMenubarOwningApplicationSync(true) as { name: string; path: string };
  return (
    <Action.Paste
      title={`Paste ${commandSummary} To ${currentApp.name}`}
      content={content}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      icon={{ fileIcon: currentApp.path }}
    />
  );
}

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
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const actions = [
    "copy-response-to-clipboard",
    "paste-to-active-app",
    "copy-prompt-to-clipboard",
    "open-chat",
    "regenerate",
  ];

  actions.splice(actions.indexOf(preferences.primaryAction), 1);
  actions.unshift(preferences.primaryAction);

  const actionComponents = actions.map((action) => {
    switch (action) {
      case "copy-response-to-clipboard":
        return (
          <Action.CopyToClipboard
            key="copy-response-to-clipboard"
            title={`Copy ${commandSummary} To Clipboard`}
            content={responseText.trim()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        );
      case "paste-to-active-app":
        return <PasteAction key="paste-to-active-app" content={responseText} commandSummary={commandSummary} />;
      case "copy-prompt-to-clipboard":
        return (
          <Action.CopyToClipboard
            key="copy-prompt-to-clipboard"
            title={`Copy Prompt To Clipboard`}
            content={promptText.trim()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        );
      case "regenerate":
        return (
          <Action
            key="regenerate"
            title="Regenerate"
            onAction={reattempt}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        );
      case "open-chat":
        return (
          <Action.Push
            key="open-chat"
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
        );
    }
  });

  return (
    <ActionPanel>
      {listItem?.length ? (
        <ActionPanel.Section title="Item Actions">
          <Action.CopyToClipboard title="Copy Item" content={listItem} />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section title="Prompt Actions">{actionComponents}</ActionPanel.Section>

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
