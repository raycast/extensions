import { Action, ActionPanel, Alert, Icon, LocalStorage, Toast, confirmAlert, showToast } from "@raycast/api";
import { Command, StoreCommand, isCommand, isStoreCommand, isTrueStr } from "../../../utils/types";
import CommandForm from "../CommandForm";
import { QUICKLINK_URL_BASE } from "../../../utils/constants";
import { updateCommand } from "../../../utils/command-utils";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { anyActionsEnabled, getActionShortcut } from "../../../utils/action-utils";

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
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
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
        "DeleteCommandAction",
        "DeleteAllCommandsAction",
        "InstallAllCommandsAction",
      ],
      settings
    )
  ) {
    return null;
  }

  return (
    <ActionPanel.Section title="Command Controls">
      {isCommand(command) ? (
        <>
          <ToggleFavoriteAction command={command} setCommands={setCommands} settings={settings} />
          <CreateQuickLinkAction command={command} settings={settings} />
          <EditCommandAction command={command} setCommands={setCommands} settings={settings} />
          <CreateDerivativeAction command={command} setCommands={setCommands} settings={settings} />
          <DeleteCommandAction command={command} commands={commands} setCommands={setCommands} settings={settings} />
          <DeleteAllCommandsAction commands={commands} setCommands={setCommands} settings={settings} />
        </>
      ) : null}
      {isStoreCommand(command) ? (
        <>
          <InstallAllCommandsAction
            availableCommands={availableCommands || []}
            commands={commands}
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
 * Action to toggle a command's favorited status.
 * @param props.command The command whose favorited status to toggle
 * @param props.setCommands The function to update the list of installed commands
 * @returns An Action component
 */
export const ToggleFavoriteAction = (props: {
  command: Command;
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, setCommands, settings } = props;
  return (
    <Action
      title={command.favorited ? `Remove From Favorites` : `Add To Favorites`}
      icon={Icon.Star}
      shortcut={getActionShortcut("ToggleFavoriteAction", settings)}
      onAction={async () => {
        const newCmdData = { ...command, favorited: command.favorited == true ? false : true };
        await updateCommand(command, newCmdData, setCommands);
        await showToast({
          title: command.favorited ? `Removed From Favorites` : `Added To Favorites`,
          style: Toast.Style.Success,
        });
      }}
    />
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
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, setCommands, settings } = props;
  return (
    <Action.Push
      title="Edit Command"
      target={
        <CommandForm
          oldData={{
            id: command.id,
            name: command.name,
            prompt: command.prompt,
            icon: command.icon,
            iconColor: command.iconColor,
            minNumFiles: command.minNumFiles?.toString(),
            acceptedFileExtensions: command.acceptedFileExtensions,
            useMetadata: command.useMetadata,
            useAudioDetails: command.useAudioDetails,
            useSoundClassification: command.useSoundClassification,
            useSubjectClassification: command.useSubjectClassification,
            useRectangleDetection: command.useRectangleDetection,
            useBarcodeDetection: command.useBarcodeDetection,
            useFaceDetection: command.useFaceDetection,
            useHorizonDetection: command.useHorizonDetection,
            outputKind: command.outputKind,
            actionScript: command.actionScript,
            showResponse: command.showResponse,
            description: command.description,
            useSaliencyAnalysis: command.useSaliencyAnalysis,
            author: command.author,
            website: command.website,
            version: command.version,
            requirements: command.requirements,
            scriptKind: command.scriptKind,
            categories: command.categories || [],
            temperature: command.temperature == undefined || command.temperature == "" ? "1.0" : command.temperature,
            favorited: command.favorited ? command.favorited : false,
            model: command.model,
            setupConfig: command.setupConfig,
            installedFromStore: command.installedFromStore,
            setupLocked: command.setupLocked,
            useSpeech: command.useSpeech,
            speakResponse: command.speakResponse,
            showInMenuBar: command.showInMenuBar,
          }}
          setCommands={setCommands}
        />
      }
      icon={Icon.Pencil}
      shortcut={getActionShortcut("EditCommandAction", settings)}
    />
  );
};

/**
 * Action to delete a single command.
 * @param props.command The command to delete
 * @param props.commands The list of installed commands
 * @param props.setCommands The function to update the list of installed commands
 * @returns An Action component
 */
export const DeleteCommandAction = (props: {
  command: Command;
  commands: Command[];
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, commands, setCommands, settings } = props;
  return (
    <Action
      title="Delete Command"
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete Command",
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          const newCommands = commands.filter((cmd) => cmd.name != command.name);
          await LocalStorage.removeItem(command.name);
          setCommands(newCommands);
        }
      }}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getActionShortcut("DeleteCommandAction", settings)}
    />
  );
};

/**
 * Action to delete all commands.
 * @param props.commands The list of installed commands
 * @param props.setCommands The function to update the list of installed commands
 * @returns An Action component
 */
export const DeleteAllCommandsAction = (props: {
  commands: Command[];
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { commands, setCommands, settings } = props;
  return (
    <Action
      title="Delete All Commands"
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete All Commands",
            message: "Are you sure?",
            primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
          })
        ) {
          commands.forEach(async (cmd) => await LocalStorage.removeItem(cmd.name));
          setCommands([]);
        }
      }}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getActionShortcut("DeleteAllCommandsAction", settings)}
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
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { command, setCommands, settings } = props;

  return (
    <Action.Push
      title="Create Derivative"
      target={
        <CommandForm
          oldData={{
            id: isCommand(command) ? command.id : "",
            name: command.name + (isCommand(command) ? " (Copy)" : ""),
            prompt: command.prompt,
            icon: command.icon,
            iconColor: command.iconColor,
            minNumFiles: command.minNumFiles?.toString(),
            acceptedFileExtensions: command.acceptedFileExtensions == "None" ? "" : command.acceptedFileExtensions,
            useMetadata: isTrueStr(command.useMetadata),
            useAudioDetails: isTrueStr(command.useAudioDetails),
            useSoundClassification: isTrueStr(command.useSoundClassification),
            useSubjectClassification: isTrueStr(command.useSubjectClassification),
            useRectangleDetection: isTrueStr(command.useRectangleDetection),
            useBarcodeDetection: isTrueStr(command.useBarcodeDetection),
            useFaceDetection: isTrueStr(command.useFaceDetection),
            useHorizonDetection: isTrueStr(command.useHorizonDetection),
            outputKind: command.outputKind,
            actionScript: command.actionScript,
            showResponse: isTrueStr(command.showResponse),
            description: command.description,
            useSaliencyAnalysis: isTrueStr(command.useSaliencyAnalysis),
            author: command.author,
            website: command.website,
            version: command.version,
            requirements: command.requirements,
            scriptKind: command.scriptKind,
            categories: isStoreCommand(command)
              ? command.categories?.split(", ") || ["Other"]
              : command.categories || [],
            temperature: command.temperature == undefined || command.temperature == "" ? "1.0" : command.temperature,
            favorited: isStoreCommand(command) ? false : command.favorited,
            setupConfig: isStoreCommand(command)
              ? command.setupConfig?.length && command.setupConfig != "None"
                ? JSON.parse(command.setupConfig)
                : undefined
              : command.setupConfig,
            installedFromStore: isStoreCommand(command) ? true : command.installedFromStore,
            setupLocked: isStoreCommand(command) ? false : command.setupLocked,
            useSpeech: isTrueStr(command.useSpeech),
            speakResponse: isTrueStr(command.speakResponse),
            showInMenuBar: isStoreCommand(command) ? false : command.showInMenuBar,
            model: isCommand(command) ? command.model : undefined,
          }}
          setCommands={setCommands}
          duplicate={true}
        />
      }
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
  commands: Command[];
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { availableCommands, commands, setCommands, settings } = props;

  const knownCommandNames = commands.map((command) => command.name);
  const knownPrompts = commands.map((command) => command.prompt);

  return (
    <Action
      title="Install All Commands"
      icon={Icon.Plus}
      shortcut={getActionShortcut("InstallAllCommandsAction", settings)}
      onAction={async () => {
        const successes: string[] = [];
        const failures: string[] = [];
        const toast = await showToast({ title: "Installing Commands...", style: Toast.Style.Animated });

        for (const command of availableCommands) {
          let cmdName = command.name;
          if (knownCommandNames?.includes(command.name)) {
            cmdName = `${command.name} 2`;
          }
          if (knownPrompts?.includes(command.prompt)) {
            failures.push(command.name);
            continue;
          }
          const commandData = {
            name: cmdName,
            prompt: command.prompt,
            icon: command.icon,
            iconColor: command.iconColor,
            minNumFiles: parseInt(command.minNumFiles as string),
            acceptedFileExtensions: command.acceptedFileExtensions == "None" ? "" : command.acceptedFileExtensions,
            useMetadata: command.useMetadata == "TRUE" ? true : false,
            useSoundClassification: command.useSoundClassification == "TRUE" ? true : false,
            useAudioDetails: command.useAudioDetails == "TRUE" ? true : false,
            useSubjectClassification: command.useSubjectClassification == "TRUE" ? true : false,
            useRectangleDetection: command.useRectangleDetection == "TRUE" ? true : false,
            useBarcodeDetection: command.useBarcodeDetection == "TRUE" ? true : false,
            useFaceDetection: command.useFaceDetection == "TRUE" ? true : false,
            useHorizonDetection: command.useHorizonDetection == "TRUE" ? true : false,
            outputKind: command.outputKind,
            actionScript: command.actionScript,
            showResponse: command.showResponse == "TRUE" ? true : false,
            description: command.description,
            useSaliencyAnalysis: command.useSaliencyAnalysis == "TRUE" ? true : false,
            author: command.author,
            website: command.website,
            version: command.version,
            requirements: command.requirements,
            scriptKind: command.scriptKind,
            categories: command.categories?.split(", ") || ["Other"],
            temperature: command.temperature,
            favorited: false,
            setupConfig:
              command.setupConfig?.length && command.setupConfig != "None"
                ? JSON.parse(command.setupConfig)
                : undefined,
            installedFromStore: true,
            setupLocked: true,
            useSpeech: command.useSpeech == "TRUE" ? true : false,
            speakResponse: command.speakResponse == "TRUE" ? true : false,
            showInMenuBar: false,
          };
          await LocalStorage.setItem(cmdName, JSON.stringify(commandData));
          successes.push(command.name);

          const allCommands = await LocalStorage.allItems();
          const filteredCommands = Object.values(allCommands).filter(
            (cmd, index) =>
              Object.keys(allCommands)[index] != "--defaults-installed" &&
              !Object.keys(allCommands)[index].startsWith("id-")
          );
          setCommands(filteredCommands.map((data) => JSON.parse(data)));
        }

        if (successes.length > 0 && failures.length == 0) {
          toast.title = `Installed ${successes.length} Command${successes.length == 1 ? "" : "s"}`;
          toast.style = Toast.Style.Success;
        } else if (successes.length > 0 && failures.length > 0) {
          toast.title = `Installed ${successes.length} Command${successes.length == 1 ? "" : "s"}`;
          toast.message = `Failed to install ${failures.length} command${
            failures.length == 1 ? "" : "s"
          }: ${failures.join(", ")}`;
          toast.style = Toast.Style.Success;
        } else if (failures.length > 0) {
          toast.title = `Failed To Install ${failures.length} Command${failures.length == 1 ? "" : "s"}`;
          toast.message = failures.join(", ");
          toast.style = Toast.Style.Failure;
        }
      }}
    />
  );
};
