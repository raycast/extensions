import { Action, ActionPanel, Alert, Clipboard, Color, confirmAlert, Icon, Keyboard, LocalStorage } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import { PrimaryAction, primaryAction } from "../types/preferences";
import { useTerminals } from "../hooks/useTerminals";
import { clearShellHistory, getShellIcon, runShellCommand } from "../utils/shell-utils";
import { Cli, Shell, ShellHistory } from "../types/types";
import { MutatePromise } from "@raycast/utils/dist/types";
import KeyEquivalent = Keyboard.KeyEquivalent;
import ActionStyle = Alert.ActionStyle;
import { useFrontmostApp } from "../hooks/useFrontmostApp";
import { CacheKey } from "../utils/constants";
import { showCustomHud } from "../utils/common-utils";

export function ActionShellCommand(props: {
  shell: Shell;
  shellCommand: string;
  cliTool: Cli | undefined;
  mutate: MutatePromise<ShellHistory[][] | undefined, ShellHistory[][] | undefined>;
  showDetail: boolean;
  showDetailMutate: MutatePromise<number | undefined, number | undefined>;
}) {
  const { shell, shellCommand, cliTool, mutate, showDetail, showDetailMutate } = props;
  const { data } = useTerminals();
  const frontmostApps = useFrontmostApp();
  const pasteAppActionTitle = () => {
    if (frontmostApps && frontmostApps.data && frontmostApps.data.length > 0) {
      return "Paste to " + frontmostApps.data[0].name;
    }
    return "Paste to Frontmost App";
  };
  const pasteAppActionIcon = () => {
    if (frontmostApps && frontmostApps.data && frontmostApps.data.length > 0) {
      return { fileIcon: frontmostApps.data[0].path };
    }
    return Icon.AppWindow;
  };
  return (
    <ActionPanel>
      <Action
        title={primaryAction === PrimaryAction.PASTE ? pasteAppActionTitle() : "Copy to Clipboard"}
        icon={primaryAction === PrimaryAction.PASTE ? pasteAppActionIcon() : Icon.Clipboard}
        onAction={async () => {
          if (primaryAction === PrimaryAction.PASTE) {
            await Clipboard.paste(shellCommand);
            await showCustomHud(`📝 ${shellCommand}`);
          } else {
            await Clipboard.copy(shellCommand);
            await showCustomHud(`📋 ${shellCommand}`);
          }
        }}
      />
      <Action
        title={primaryAction === PrimaryAction.PASTE ? "Copy to Clipboard" : pasteAppActionTitle()}
        icon={primaryAction === PrimaryAction.PASTE ? Icon.Clipboard : pasteAppActionIcon()}
        onAction={async () => {
          if (primaryAction === PrimaryAction.PASTE) {
            await Clipboard.copy(shellCommand);
            await showCustomHud(`📋 ${shellCommand}`);
          } else {
            await Clipboard.paste(shellCommand);
            await showCustomHud(`📝 ${shellCommand}`);
          }
        }}
      />
      <ActionPanel.Section>
        <Action
          title={"Copy CLI Tool"}
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
          onAction={async () => {
            await Clipboard.copy(cliTool?.command || "");
            await showCustomHud(`📋 ${cliTool?.command}`);
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
              title={`Run in ${terminal.application.name}`}
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
          title={`Refresh ${shell} History`}
          icon={Icon.Repeat}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            await mutate();
          }}
        />
        <Action
          title={`Clear ${shell} History`}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={async () => {
            await confirmAlert({
              icon: getShellIcon(shell),
              title: `Clear ${shell} History`,
              message: `Clearing ${shell} history cannot be undone!`,
              primaryAction: {
                title: "Confirm",
                style: ActionStyle.Destructive,
                onAction: async () => {
                  await clearShellHistory(shell);
                  await mutate();
                },
              },
            });
          }}
        />
        <Action
          title={`Toggle History Deatil`}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["shift", "cmd"], key: "d" }}
          onAction={async () => {
            LocalStorage.setItem(CacheKey.ShowDetail, !showDetail);
            await mutate();
            await showDetailMutate();
          }}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
