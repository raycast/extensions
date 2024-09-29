import { Action, ActionPanel, closeMainWindow, Icon, popToRoot } from "@raycast/api";
import { type FC } from "react";
import { Result } from "../../../Result";
import { TERMINAL_TYPES_CONFIG } from "../../helpers/constants";
import { getAvailableActions } from "../../helpers/command";

interface Props {
  command: string;
  addToRecentlyUsed: (command: string) => void;
}

export const ActionList: FC<Props> = ({ command, addToRecentlyUsed }) => {
  const availableActions = getAvailableActions();

  const actionHandler = (command: string, runInShell: ((command: string) => void) | undefined) => {
    closeMainWindow();
    popToRoot();
    addToRecentlyUsed(command);
    runInShell && runInShell(command);
  };

  return (
    <ActionPanel>
      <Action.Push
        title="Execute"
        icon={Icon.List}
        onPush={() => addToRecentlyUsed(command)}
        target={<Result command={command} />}
      />

      {availableActions.map((action) => {
        const { name, function: runInShell } = TERMINAL_TYPES_CONFIG[action as keyof typeof TERMINAL_TYPES_CONFIG];

        return (
          <Action
            title={`Execute in ${name}.app`}
            icon={Icon.Window}
            onAction={() => actionHandler(command, runInShell)}
            key={action}
          />
        );
      })}

      <Action.CopyToClipboard
        title="Copy to Clipboard"
        content={command}
        onCopy={() => {
          addToRecentlyUsed(command);
        }}
      />
    </ActionPanel>
  );
};
