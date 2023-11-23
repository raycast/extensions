import { Action, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { Command, StoreCommand } from "../../../utils/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../../utils/action-utils";

/**
 * Action to install a command from the PromptLab store.
 * @param props.command The command to install.
 * @param props.commands The list of installed commands.
 * @param props.setCommands The function to update the list of installed commands.
 * @returns {JSX.Element} The action component.
 */
export default function InstallCommandAction(props: {
  command: StoreCommand;
  commands: Command[];
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}): JSX.Element | null {
  const { command, commands, setCommands, settings } = props;

  const knownCommandNames = commands?.map((command) => command.name);
  const knownPrompts = commands?.map((command) => command.prompt);

  if (!isActionEnabled("InstallCommandAction", settings)) {
    return null;
  }

  return (
    <Action
      title="Install Command"
      icon={Icon.Plus}
      shortcut={getActionShortcut("InstallCommandAction", settings)}
      onAction={async () => {
        let cmdName = command.name;
        if (knownCommandNames?.includes(command.name)) {
          cmdName = `${command.name} 2`;
        }
        if (knownPrompts?.includes(command.prompt)) {
          showToast({ title: "Error", message: `Command already installed`, style: Toast.Style.Failure });
          return;
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
            command.setupConfig?.length && command.setupConfig != "None" ? JSON.parse(command.setupConfig) : undefined,
          installedFromStore: true,
          setupLocked: true,
          useSpeech: command.useSpeech == "TRUE" ? true : false,
          speakResponse: command.speakResponse == "TRUE" ? true : false,
          showInMenuBar: false,
        };
        LocalStorage.setItem(cmdName, JSON.stringify(commandData)).then(() => {
          showToast({ title: "Command Installed", message: `${command.name} has been installed.` });
          Promise.resolve(LocalStorage.allItems()).then((commandData) => {
            const commandDataFiltered = Object.values(commandData).filter(
              (cmd, index) =>
                !Object.keys(commandData)[index].startsWith("--") && !Object.keys(cmd)[index].startsWith("id-")
            );
            setCommands(commandDataFiltered.map((data) => JSON.parse(data)));
          });
        });
      }}
    />
  );
}
