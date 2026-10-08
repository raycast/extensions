import { Action, ActionPanel, Icon } from "@raycast/api";
import { Command, StoreCommand, isCommand, isStoreCommand } from "../../../lib/commands/types";
import CommandForm from "../CommandForm";
import { QUICKLINK_URL_BASE } from "../../../lib/common/constants";
import { loadCommands } from "../../../lib/commands";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { anyActionsEnabled, getActionShortcut } from "../../../lib/actions";
import { commandDataForEditing } from "../../../lib/commands";
import { installAllCommands } from "../../../lib/commands/StoreCommand";
import ToggleFavoriteAction from "../../actions/ToggleFavoriteAction";
import DeleteAction from "../../actions/DeleteAction";
import DeleteAllAction from "../../actions/DeleteAllAction";

/**
 * Section for actions related to modifying commands (editing, deleting, etc.).
 * @param props.command The command to modify
 * @param props.availableCommands The list of commands available to install
 * @param props.commands The list of all installed commands
 * @param props.setCommands The function to update the list of installed commands
 * @returns An ActionPanel.Section component
 */
export const CommandControlsActionsSection = (props: {
  command: Command | StoreCommand;
  availableCommands?: StoreCommand[];
  commands: Command[];
  setCommands: (commands: Command[]) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, availableCommands, commands, setCommands, settings } = props;

  if (
    !anyActionsEnabled(
      [
        "ToggleFavoriteAction",
        "CreateQuickLinkAction",
        "EditCommandAction",
        "CreateDerivativeAction",
        "DeleteAction",
        "DeleteAllAction",
        "InstallAllCommandsAction",
      ],
      settings,
    )
  ) {
    return null;
  }

  async function revalidateCommands() {
    const newCommands = await loadCommands();
    setCommands(newCommands);
  }

  return (
    <ActionPanel.Section title="Command Controls">
      {isCommand(command) ? (
        <>
          <ToggleFavoriteAction object={command} settings={settings} revalidateObjects={revalidateCommands} />
          <CreateQuickLinkAction command={command} settings={settings} />
          <EditCommandAction command={command} setCommands={setCommands} settings={settings} />
          <CreateDerivativeAction command={command} setCommands={setCommands} settings={settings} />
          <DeleteAction object={command} settings={settings} revalidateObjects={revalidateCommands} />
          <DeleteAllAction objects={commands} settings={settings} revalidateObjects={revalidateCommands} />
        </>
      ) : null}
      {isStoreCommand(command) ? (
        <>
          <InstallAllCommandsAction
            availableCommands={availableCommands || []}
            setCommands={setCommands}
            settings={settings}
          />
          <CreateDerivativeAction command={command} setCommands={setCommands} settings={settings} />
        </>
      ) : null}
    </ActionPanel.Section>
  );
};

/**
 * Action to display the "Create QuickLink" view for a command.
 * @param props.command The command to create a QuickLink for
 * @returns An Action component
 */
export const CreateQuickLinkAction = (props: { command: Command; settings: typeof defaultAdvancedSettings }) => {
  const { command, settings } = props;
  return (
    <Action.CreateQuicklink
      quicklink={{
        link: `${QUICKLINK_URL_BASE}${encodeURIComponent(command.id)}%22${
          command.prompt?.includes("{{input}}") ? "%2C%22queryInput%22%3A%22{Input}%22" : ""
        }%7D`,
        name: command.name,
      }}
      shortcut={getActionShortcut("CreateQuickLinkAction", settings)}
    />
  );
};

/**
 * Action to display the "Edit Command" form for a command.
 * @param props.command The command to edit
 * @param props.setCommands The function to update the list of installed commands
 * @returns An Action component
 */
export const EditCommandAction = (props: {
  command: Command;
  setCommands: (commands: Command[]) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, setCommands, settings } = props;
  return (
    <Action.Push
      title="Edit Command"
      target={<CommandForm oldData={commandDataForEditing(command)} setCommands={setCommands} />}
      icon={Icon.Pencil}
      shortcut={getActionShortcut("EditCommandAction", settings)}
    />
  );
};

/**
 * Action to display the "Create Derivative" form for a command.
 * @param props.command The command to create a derivative of
 * @param props.setCommands The function to update the list of installed commands
 * @returns An Action component
 */
export const CreateDerivativeAction = (props: {
  command: Command | StoreCommand;
  setCommands: (commands: Command[]) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, setCommands, settings } = props;

  return (
    <Action.Push
      title="Create Derivative"
      target={<CommandForm oldData={commandDataForEditing(command, true)} setCommands={setCommands} duplicate={true} />}
      icon={Icon.EyeDropper}
      shortcut={getActionShortcut("CreateDerivativeAction", settings)}
    />
  );
};

/**
 * Action to install all available commands from the store.
 * @param props.availableCommands The list of available commands
 * @param props.commands The list of installed commands
 * @param props.setCommands The function to update the list of installed commands
 * @returns An Action component
 */
export const InstallAllCommandsAction = (props: {
  availableCommands: StoreCommand[];
  setCommands: (commands: Command[]) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { availableCommands, setCommands, settings } = props;

  return (
    <Action
      title="Install All Commands"
      icon={Icon.Plus}
      shortcut={getActionShortcut("InstallAllCommandsAction", settings)}
      onAction={async () => installAllCommands(availableCommands, setCommands)}
    />
  );
};
