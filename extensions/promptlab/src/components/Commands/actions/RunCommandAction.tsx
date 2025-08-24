import { Action, Icon } from "@raycast/api";
import { isTrueStr } from "../../../lib/common/types";
import { Command, PLCommandRunProperties, StoreCommand, isCommand } from "../../../lib/commands/types";
import CommandResponse from "../CommandResponse";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { AdvancedSettings } from "../../../data/default-advanced-settings";

/**
 * Action to run a command.
 * @param props.command The command to run.
 * @param props.setCommands The function to update the list of installed commands.
 */
export default function RunCommandAction(props: {
  command: Command | StoreCommand;
  setCommands?: (commands: Command[]) => void;
  settings: AdvancedSettings;
  onCompletion?: (newRun: PLCommandRunProperties) => void;
}) {
  const { command, setCommands, settings, onCompletion } = props;

  if (!isActionEnabled("RunCommandAction", settings)) {
    return null;
  }

  return (
    <Action.Push
      title="Run PromptLab Command"
      target={
        <CommandResponse
          command={command as Command}
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
          onCompletion={onCompletion}
        />
      }
      icon={Icon.ArrowRight}
      shortcut={getActionShortcut("RunCommandAction", settings)}
    />
  );
}
