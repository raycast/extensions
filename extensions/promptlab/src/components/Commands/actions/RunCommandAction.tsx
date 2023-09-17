import { Action, Icon } from "@raycast/api";
import { Command, StoreCommand, isCommand, isTrueStr } from "../../../utils/types";
import CommandResponse from "../CommandResponse";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../../utils/action-utils";

/**
 * Action to run a command.
 * @param props.command The command to run.
 * @param props.setCommands The function to update the list of installed commands.
 * @returns {JSX.Element} The action component.
 */
export default function RunCommandAction(props: {
  command: Command | StoreCommand;
  setCommands?: React.Dispatch<React.SetStateAction<Command[]>>;
  settings: typeof defaultAdvancedSettings;
}): JSX.Element | null {
  const { command, setCommands, settings } = props;

  if (!isActionEnabled("RunCommandAction", settings)) {
    return null;
  }

  return (
    <Action.Push
      title="Run PromptLab Command"
      target={
        <CommandResponse
          commandName={command.name}
          prompt={command.prompt}
          options={{
            minNumFiles: parseInt(command.minNumFiles as string),
            acceptedFileExtensions:
              command.acceptedFileExtensions?.length && command.acceptedFileExtensions !== "None"
                ? command.acceptedFileExtensions?.split(",").map((item) => item.trim())
                : undefined,
            useMetadata: isTrueStr(command.useMetadata),
            useSoundClassification: isTrueStr(command.useSoundClassification),
            useAudioDetails: isTrueStr(command.useAudioDetails),
            useBarcodeDetection: isTrueStr(command.useBarcodeDetection),
            useFaceDetection: isTrueStr(command.useFaceDetection),
            useHorizonDetection: isTrueStr(command.useHorizonDetection),
            useRectangleDetection: isTrueStr(command.useRectangleDetection),
            useSubjectClassification: isTrueStr(command.useSubjectClassification),
            outputKind: command.outputKind,
            actionScript: command.actionScript,
            showResponse: isTrueStr(command.showResponse),
            useSaliencyAnalysis: isTrueStr(command.useSaliencyAnalysis),
            scriptKind: command.scriptKind,
            temperature: command.temperature,
            model: command.model,
            setupConfig: isCommand(command)
              ? command.setupConfig
              : command.setupConfig
              ? JSON.parse(command.setupConfig)
              : undefined,
            useSpeech: isTrueStr(command.useSpeech),
            speakResponse: isTrueStr(command.speakResponse),
          }}
          setCommands={setCommands}
        />
      }
      icon={Icon.ArrowRight}
      shortcut={getActionShortcut("RunCommandAction", settings)}
    />
  );
}
