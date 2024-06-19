import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  showHUD,
  trash,
} from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { PrimaryAction, primaryAction, secondaryAction } from "../types/preferences";
import { useTerminals } from "../hooks/useTerminals";
import { bashHistoryFilePath, runShellCommand, zshHistoryFilePath } from "../utils/shell-utils";
import { Shell, ShellHistory } from "../types/types";
import { MutatePromise } from "@raycast/utils/dist/types";
import KeyEquivalent = Keyboard.KeyEquivalent;
import ActionStyle = Alert.ActionStyle;

export function ActionShellCommand(props: {
  shell: Shell;
  shellCommand: string;
  cliTool: string;
  mutate: MutatePromise<ShellHistory[][]>;
}) {
  const { shell, shellCommand, cliTool, mutate } = props;
  const { data } = useTerminals();
  return (
    <ActionPanel>
      <Action
        title={primaryAction}
        icon={primaryAction === PrimaryAction.PASTE ? Icon.AppWindow : Icon.Clipboard}
        onAction={async () => {
          if (primaryAction === PrimaryAction.PASTE) {
            await Clipboard.paste(shellCommand);
            await showHUD(`📝 ${shellCommand}`);
          } else {
            await Clipboard.copy(shellCommand);
            await showHUD(`📋 ${shellCommand}`);
          }
        }}
      />
      <Action
        title={secondaryAction}
        icon={primaryAction === PrimaryAction.PASTE ? Icon.Clipboard : Icon.AppWindow}
        onAction={async () => {
          if (primaryAction === PrimaryAction.PASTE) {
            await Clipboard.copy(shellCommand);
            await showHUD(`📋 ${shellCommand}`);
          } else {
            await Clipboard.paste(shellCommand);
            await showHUD(`📝 ${shellCommand}`);
          }
        }}
      />
      <ActionPanel.Section>
        <Action
          title={"Copy CLI Tool"}
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(cliTool);
            await showHUD(`📋 ${cliTool}`);
          }}
        />
        <Action.CreateSnippet
          icon={Icon.Snippets}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          snippet={{ text: shellCommand, name: shellCommand }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {data?.map((terminal, index) => {
          return (
            <Action
              key={terminal.application.path}
              title={
                terminal.supportInput ? `Run in ${terminal.application.name}` : `Open ${terminal.application.name}`
              }
              icon={{ fileIcon: terminal.application.path }}
              shortcut={{ modifiers: ["ctrl"], key: `${index + 1}` as KeyEquivalent }}
              onAction={async () => {
                await runShellCommand(shellCommand, terminal);
              }}
            />
          );
        })}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={`Clear ${shell} History`}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={async () => {
            await confirmAlert({
              icon: shell === Shell.ZSH ? "zsh.png" : "bash.png",
              title: `Clear ${shell} History`,
              message: `Clearing ${shell} history cannot be undone!`,
              primaryAction: {
                title: "Clear",
                style: ActionStyle.Destructive,
                onAction: async () => {
                  if (shell === Shell.ZSH) {
                    await trash(zshHistoryFilePath);
                  } else if (shell === Shell.BASH) {
                    await trash(bashHistoryFilePath);
                  }
                  await mutate();
                },
              },
            });
          }}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
