import { Action, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { Command, StoreCommand } from "../../../lib/commands/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { commandFromStoreCommand } from "../../../lib/commands";

/**
 * Action to install a command from the PromptLab store.
 * @param props.command The command to install.
 * @param props.commands The list of installed commands.
 * @param props.setCommands The function to update the list of installed commands.
 */
export default function InstallCommandAction(props: {
  command: StoreCommand;
  setCommands: (commands: Command[]) => void;
  settings: typeof defaultAdvancedSettings;
}) {
  const { command, setCommands, settings } = props;

  if (!isActionEnabled("InstallCommandAction", settings)) {
    return null;
  }

  return (
    <Action
      title="Install Command"
      icon={Icon.Plus}
      shortcut={getActionShortcut("InstallCommandAction", settings)}
      onAction={async () => {
        const newCommand = await commandFromStoreCommand(command);
        if (newCommand == undefined) {
          showToast({
            title: "Command Installation Failed",
            message: `There was an error installing ${command.name}.`,
            style: Toast.Style.Failure,
          });
          return;
        }

        LocalStorage.setItem(newCommand.name, JSON.stringify(newCommand)).then(() => {
          showToast({ title: "Command Installed", message: `${command.name} has been installed.` });
          Promise.resolve(LocalStorage.allItems()).then((commandData) => {
            const commandDataFiltered = Object.values(commandData).filter(
              (cmd, index) =>
                !Object.keys(commandData)[index].startsWith("--") && !Object.keys(cmd)[index].startsWith("id-"),
            );
            setCommands(commandDataFiltered.map((data) => JSON.parse(data)));
          });
        });
      }}
    />
  );
}
