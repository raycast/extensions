import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  LocalStorage,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./components/CommandResponse";
import CommandForm from "./components/CommandForm";
import { Command, StoreCommand } from "./utils/types";
import { useCachedState, useFetch } from "@raycast/utils";
import { STORE_ENDPOINT, STORE_KEY } from "./utils/constants";
import { getCommandJSON } from "./utils/command-utils";

export default function Discover() {
  const [myCommands, setMyCommands] = useState<Command[]>();
  const [availableCommands, setAvailableCommands] = useCachedState<StoreCommand[]>("availableCommands", []);

  useEffect(() => {
    // Get installed commands from local storage
    Promise.resolve(LocalStorage.allItems()).then((commandData) => {
      const commandDataFiltered = Object.values(commandData).filter(
        (cmd, index) => Object.keys(commandData)[index] != "--defaults-installed"
      );
      setMyCommands(commandDataFiltered.map((data) => JSON.parse(data)));
    });
  }, []);

  // Get available commands from store
  const { data, isLoading } = useFetch(STORE_ENDPOINT, { headers: { "X-API-KEY": STORE_KEY } });
  useEffect(() => {
    if (data && !isLoading) {
      setAvailableCommands((data as { data: StoreCommand[] })["data"].reverse());
    }
  }, [data, isLoading]);

  const knownCommandNames = myCommands?.map((command) => command.name);
  const knownPrompts = myCommands?.map((command) => command.prompt);

  const listItems = availableCommands.map((command) => (
    <List.Item
      title={command.name}
      icon={{
        source: command.icon,
        tintColor: command.iconColor == undefined ? Color.PrimaryText : command.iconColor,
      }}
      key={command.name}
      accessories={
        knownPrompts?.includes(command.prompt) ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []
      }
      detail={
        <List.Item.Detail
          markdown={`# ${command.name}${knownPrompts?.includes(command.prompt) ? " _(Installed)_" : ""}

Version: ${command.version || "1.0.0"}

${command.author?.length ? `Author: ${command.author}` : ``}

${command.website?.length ? `Website: [${command.website}](${command.website})` : ``}
  
## Description

${command.description || "None"}
  
## Prompt

\`\`\`
${command.prompt}
\`\`\`
  
## Action Script

${
  command.actionScript?.length
    ? `\`\`\`${command.scriptKind}
${command.actionScript}
\`\`\``
    : `\`\`\`
None
\`\`\``
}

${
  command.actionScript?.length && command.actionScript != "None"
    ? `Script Kind: ${command.scriptKind == undefined ? "AppleScript" : command.scriptKind}`
    : ``
}

## Requirements

${
  command.requirements?.length
    ? `\`\`\`
${command.requirements}
\`\`\``
    : `\`\`\`
None
\`\`\``
}

${
  command.exampleOutput
    ? `## Example Output
![Example of the command's output](${command.exampleOutput})
`
    : ``
}
  
  ## Options
  | Option | Value |
  | --- | --- |
  | Output View | ${(command.outputKind?.at(0)?.toUpperCase() || "") + (command.outputKind?.substring(1) || "")} |
  | Show Response View | ${command.showResponse == "TRUE" ? "Yes" : "No"} |
  | Minimum File Count | ${command.minNumFiles} |
  | Use File Metadata? | ${command.useMetadata == "TRUE" ? "Yes" : "No"} |
  | Use Sound Classification? | ${command.useSoundClassification == "TRUE" ? "Yes" : "No"} |
  | Use Subject Classification? | ${command.useSubjectClassification == "TRUE" ? "Yes" : "No"} |
  | Use Audio Transcription? | ${command.useAudioDetails == "TRUE" ? "Yes" : "No"} |
  | Use Barcode Detection? | ${command.useBarcodeDetection == "TRUE" ? "Yes" : "No"} |
  | Use Face Detection? | ${command.useFaceDetection == "TRUE" ? "Yes" : "No"} |
  | Use Rectangle Detection? | ${command.useRectangleDetection == "TRUE" ? "Yes" : "No"} |
  | Use Saliency Analysis? | ${command.useSaliencyAnalysis == "TRUE" ? "Yes" : "No"} |`}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Install Command"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
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
                acceptedFileExtensions: command.acceptedFileExtensions?.length
                  ? command.acceptedFileExtensions?.split(",").map((item) => item.trim())
                  : undefined,
                useMetadata: command.useMetadata == "TRUE" ? true : false,
                useSoundClassification: command.useSoundClassification == "TRUE" ? true : false,
                useAudioDetails: command.useAudioDetails == "TRUE" ? true : false,
                useSubjectClassification: command.useSubjectClassification == "TRUE" ? true : false,
                useRectangleDetection: command.useRectangleDetection == "TRUE" ? true : false,
                useBarcodeDetection: command.useBarcodeDetection == "TRUE" ? true : false,
                useFaceDetection: command.useFaceDetection == "TRUE" ? true : false,
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
              };
              LocalStorage.setItem(cmdName, JSON.stringify(commandData)).then(() => {
                showToast({ title: "Command Installed", message: `${command.name}" has been installed.` });
                Promise.resolve(LocalStorage.allItems()).then((commandData) => {
                  const commandDataFiltered = Object.values(commandData).filter(
                    (cmd, index) => Object.keys(commandData)[index] != "--defaults-installed"
                  );
                  setMyCommands(commandDataFiltered.map((data) => JSON.parse(data)));
                });
              });
            }}
          />

          <Action.Push
            title="Run Command Without Installing"
            target={
              <CommandResponse
                commandName={command.name}
                prompt={command.prompt}
                options={{
                  minNumFiles: parseInt(command.minNumFiles as string),
                  acceptedFileExtensions: command.acceptedFileExtensions?.length
                    ? command.acceptedFileExtensions?.split(",").map((item) => item.trim())
                    : undefined,
                  useMetadata: command.useMetadata == "TRUE" ? true : false,
                  useSoundClassification: command.useSoundClassification == "TRUE" ? true : false,
                  useAudioDetails: command.useAudioDetails == "TRUE" ? true : false,
                  useBarcodeDetection: command.useBarcodeDetection == "TRUE" ? true : false,
                  useFaceDetection: command.useFaceDetection == "TRUE" ? true : false,
                  useRectangleDetection: command.useRectangleDetection == "TRUE" ? true : false,
                  useSubjectClassification: command.useSubjectClassification == "TRUE" ? true : false,
                  outputKind: command.outputKind,
                  actionScript: command.actionScript,
                  showResponse: command.showResponse == "TRUE" ? true : false,
                  useSaliencyAnalysis: command.useSaliencyAnalysis == "TRUE" ? true : false,
                  scriptKind: command.scriptKind,
                }}
              />
            }
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />

          <ActionPanel.Section title="Copy Actions">
            <Action.CopyToClipboard
              title="Copy Prompt"
              content={command.prompt}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action.CopyToClipboard
              title="Copy Command JSON"
              content={getCommandJSON(command)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            />
            <Action
              title="Export All Commands"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={async () => {
                Promise.resolve(
                  LocalStorage.allItems().then((items) => {
                    delete items["--defaults-installed"];
                    Clipboard.copy(JSON.stringify(items)).then(() => showHUD("Copied All PromptLab Commands"));
                  })
                );
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Command Controls">
            <Action.Push
              title="Create Derivative"
              target={
                <CommandForm
                  oldData={{
                    name: command.name,
                    prompt: command.prompt,
                    icon: command.icon,
                    iconColor: command.iconColor,
                    minNumFiles: command.minNumFiles as unknown as string,
                    acceptedFileExtensions: command.acceptedFileExtensions,
                    useMetadata: command.useMetadata == "TRUE" ? true : false,
                    useAudioDetails: command.useAudioDetails == "TRUE" ? true : false,
                    useSoundClassification: command.useSoundClassification == "TRUE" ? true : false,
                    useSubjectClassification: command.useSubjectClassification == "TRUE" ? true : false,
                    useRectangleDetection: command.useRectangleDetection == "TRUE" ? true : false,
                    useBarcodeDetection: command.useBarcodeDetection == "TRUE" ? true : false,
                    useFaceDetection: command.useFaceDetection == "TRUE" ? true : false,
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
                  }}
                  setCommands={setMyCommands}
                  duplicate={true}
                />
              }
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["ctrl"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  ));

  return (
    <List
      isLoading={!availableCommands || isLoading}
      isShowingDetail={availableCommands != undefined}
      searchBarPlaceholder="Search PromptLab store..."
    >
      <List.EmptyView title="No Custom PromptLab Commands" />
      <List.Section title="Newest Commands">{listItems.slice(0, 5)}</List.Section>
      <List.Section title="————————————————————">{listItems.slice(5)}</List.Section>
    </List>
  );
}
