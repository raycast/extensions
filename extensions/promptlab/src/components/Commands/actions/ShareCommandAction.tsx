import { Action, Icon, Toast, showToast } from "@raycast/api";
import { Command, StoreCommand } from "../../../lib/commands/types";
import { STORE_ENDPOINT, STORE_KEY } from "../../../lib/common/constants";
import fetch from "node-fetch";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { AdvancedSettings } from "../../../data/default-advanced-settings";

/**
 * Action to share a command to the PromptLab store.
 * @param props.command The command to share.
 */
export default function ShareCommandAction(props: { command: Command; settings: AdvancedSettings }) {
  const { command, settings } = props;

  if (!isActionEnabled("ShareCommandAction", settings)) {
    return null;
  }

  return (
    <Action
      title="Share To PromptLab Store"
      icon={Icon.Upload}
      shortcut={getActionShortcut("ShareCommandAction", settings)}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Uploading Command",
        });

        fetch(STORE_ENDPOINT, { headers: { "X-API-KEY": STORE_KEY } }).then(async (response) => {
          const storeCommands: StoreCommand[] = ((await response.json()) as { data: StoreCommand[] })["data"];

          const storeCommandPrompts = storeCommands.map((command) => command.prompt);

          if (storeCommandPrompts.includes(command.prompt)) {
            toast.style = Toast.Style.Failure;
            toast.title = "Error";
            toast.message = "Command already exists in PromptLab Store";
            return;
          }

          fetch(STORE_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": STORE_KEY,
            },
            body: JSON.stringify({
              data: {
                name: command.name,
                prompt: command.prompt,
                icon: command.icon,
                iconColor: command.iconColor,
                minNumFiles: command.minNumFiles?.toString(),
                acceptedFileExtensions: command.acceptedFileExtensions || "None",
                useMetadata: command.useMetadata ? "TRUE" : "FALSE",
                useAudioDetails: command.useAudioDetails ? "TRUE" : "FALSE",
                useSoundClassification: command.useSoundClassification ? "TRUE" : "FALSE",
                useSubjectClassification: command.useSubjectClassification ? "TRUE" : "FALSE",
                useRectangleDetection: command.useRectangleDetection ? "TRUE" : "FALSE",
                useBarcodeDetection: command.useBarcodeDetection ? "TRUE" : "FALSE",
                useFaceDetection: command.useFaceDetection ? "TRUE" : "FALSE",
                useHorizonDetection: command.useHorizonDetection ? "TRUE" : "FALSE",
                outputKind: command.outputKind || "Detail",
                actionScript: command.actionScript || "None",
                showResponse: command.showResponse ? "TRUE" : "FALSE",
                description: command.description || "None",
                useSaliencyAnalysis: command.useSaliencyAnalysis ? "TRUE" : "FALSE",
                exampleOutput: "None",
                author: command.author || "None",
                website: command.website || "None",
                version: command.version || "1.0.0",
                requirements: command.requirements || "None",
                scriptKind: command.scriptKind || "applescript",
                categories: command.categories?.join(", ") || "Other",
                temperature:
                  command.temperature == undefined || command.temperature == "" ? "1.0" : command.temperature,
                setupConfig: command.setupConfig ? JSON.stringify(command.setupConfig) : "None",
                useSpeech: command.useSpeech ? "TRUE" : "FALSE",
                speakResponse: command.speakResponse ? "TRUE" : "FALSE",
                recordRuns: command.recordRuns ? "TRUE" : "FALSE",
              },
            }),
          }).then((res) => {
            if (res.statusText == "OK") {
              toast.style = Toast.Style.Success;
              toast.title = "Success";
              toast.message = `Added ${command.name} to the PromptLab Store`;
            } else {
              toast.style = Toast.Style.Failure;
              toast.title = "Error";
              toast.message = "Couldn't upload command";
            }
          });
        });
      }}
    />
  );
}
