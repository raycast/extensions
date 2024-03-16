import { Action, ActionPanel, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import CommandChatView from "../../Chats/CommandChatView";
import { ExtensionPreferences } from "../../../lib/preferences/types";
import { CommandOptions } from "../../../lib/commands/types";
import { getMenubarOwningApplication } from "../../../lib/context-utils";
import { useEffect, useState } from "react";
import { logDebug } from "../../../lib/dev-utils";

/**
 * A command action that pastes the provided text into the current application.
 * @param props.content The text to paste.
 * @param props.commandSummary The summary of the command that is being pasted.
 * @returns A Paste action component.
 */
function PasteAction(props: { content: string; commandSummary: string }) {
  const { content, commandSummary } = props;
  const [currentApp, setCurrentApp] = useState<{ name: string; path: string }>();

  /**
   * Gets the active application and sets the current app state. The timeout will repeat until the component is unmounted by Raycast.
   */
  const getActiveApp = async () => {
    Promise.resolve(getMenubarOwningApplication(true) as Promise<{ name: string; path: string }>)
      .then((app) => {
        setCurrentApp(app);
      })
      .then(() => {
        setTimeout(() => {
          logDebug("Getting active app...");
          getActiveApp();
        }, 1000);
      });
  };

  useEffect(() => {
    Promise.resolve(getActiveApp());
  }, []);

  return (
    <Action.Paste
      title={`Paste ${commandSummary}${currentApp ? ` To ${currentApp.name}` : ``}`}
      content={content}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      icon={currentApp ? { fileIcon: currentApp.path } : Icon.Clipboard}
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
  speaking?: boolean;
  stopSpeech?: () => void;
  restartSpeech?: () => void;
}) {
  const {
    commandName,
    commandSummary,
    options,
    responseText,
    promptText,
    reattempt,
    files,
    listItem,
    cancel,
    stopSpeech,
    speaking,
    restartSpeech,
  } = props;
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

      {options.speakResponse ? (
        <ActionPanel.Section title="Speech Actions">
          {speaking ? (
            <Action
              title="Stop Speech"
              icon={Icon.SpeakerOff}
              onAction={() => stopSpeech?.()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          ) : (
            <Action
              title="Restart Speech"
              icon={Icon.SpeakerOff}
              onAction={() => restartSpeech?.()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          )}
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section title="Prompt Actions">{actionComponents}</ActionPanel.Section>

      {files?.length ? (
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
      ) : null}
    </ActionPanel>
  );
}
