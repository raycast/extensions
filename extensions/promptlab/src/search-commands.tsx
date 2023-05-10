import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./components/CommandResponse";
import { installDefaults } from "./utils/file-utils";
import CommandForm from "./components/CommandForm";
import { Command, StoreCommand } from "./utils/types";
import fetch from "node-fetch";
import { QUICKLINK_URL_BASE, STORE_ENDPOINT, STORE_KEY } from "./utils/constants";
import { getCommandJSON } from "./utils/command-utils";

export default function SearchCommand(props: { arguments: { commandName: string; queryInput: string } }) {
  const { commandName, queryInput } = props.arguments;
  const [commands, setCommands] = useState<Command[]>();
  const [searchText, setSearchText] = useState<string | undefined>(
    commandName == undefined || queryInput ? undefined : commandName.trim()
  );

  useEffect(() => {
    /* Add default commands if necessary, then get all commands */
    Promise.resolve(installDefaults()).then(() => {
      Promise.resolve(LocalStorage.allItems()).then((commandData) => {
        const commandDataFiltered = Object.values(commandData).filter(
          (cmd, index) => Object.keys(commandData)[index] != "--defaults-installed"
        );
        setCommands(commandDataFiltered.map((data) => JSON.parse(data)));

        if (searchText == undefined && !Object.keys(commandDataFiltered).includes(commandName)) {
          setSearchText(commandName);
        }
      });
    });
  }, []);

  const commandNames = commands ? commands.map((command) => command.name) : [];
  if (commands && commandNames.includes(commandName)) {
    const command = commands[commandNames.indexOf(commandName)];
    return (
      <CommandResponse
        commandName={command.name}
        prompt={command.prompt}
        input={queryInput}
        options={{
          minNumFiles: parseInt(command.minNumFiles as unknown as string),
          acceptedFileExtensions: command.acceptedFileExtensions?.length
            ? command.acceptedFileExtensions?.split(",").map((item) => item.trim())
            : undefined,
          useMetadata: command.useMetadata,
          useSoundClassification: command.useSoundClassification,
          useAudioDetails: command.useAudioDetails,
          useBarcodeDetection: command.useBarcodeDetection,
          useFaceDetection: command.useFaceDetection,
          useRectangleDetection: command.useRectangleDetection,
          useSubjectClassification: command.useSubjectClassification,
          outputKind: command.outputKind,
          actionScript: command.actionScript,
          showResponse: command.showResponse,
          useSaliencyAnalysis: command.useSaliencyAnalysis,
        }}
      />
    );
  }

  const listItems = commands
    ?.sort((a, b) => (a.name > b.name ? 1 : -1))
    .map((command) => (
      <List.Item
        title={command.name}
        icon={{
          source: command.icon,
          tintColor: command.iconColor == undefined ? Color.PrimaryText : command.iconColor,
        }}
        key={command.name}
        detail={
          <List.Item.Detail
            markdown={`# ${command.name}
          
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

## Options
| Option | Value |
| --- | --- |
| Output View | ${(command.outputKind?.at(0)?.toUpperCase() || "") + (command.outputKind?.substring(1) || "")} |
| Show Response View | ${command.showResponse ? "Yes" : "No"} |
| Minimum File Count | ${command.minNumFiles} |
| Use File Metadata? | ${command.useMetadata ? "Yes" : "No"} |
| Use Sound Classification? | ${command.useSoundClassification ? "Yes" : "No"} |
| Use Subject Classification? | ${command.useSubjectClassification ? "Yes" : "No"} |
| Use Audio Transcription? | ${command.useAudioDetails ? "Yes" : "No"} |
| Use Barcode Detection? | ${command.useBarcodeDetection ? "Yes" : "No"} |
| Use Face Detection? | ${command.useFaceDetection ? "Yes" : "No"} |
| Use Rectangle Detection? | ${command.useRectangleDetection ? "Yes" : "No"} |
| Use Saliency Analysis? | ${command.useSaliencyAnalysis ? "Yes" : "No"} |`}
          />
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Run PromptLab Command"
              target={
                <CommandResponse
                  commandName={command.name}
                  prompt={command.prompt}
                  options={{
                    minNumFiles: parseInt(command.minNumFiles as string),
                    acceptedFileExtensions: command.acceptedFileExtensions?.length
                      ? command.acceptedFileExtensions?.split(",").map((item) => item.trim())
                      : undefined,
                    useMetadata: command.useMetadata,
                    useSoundClassification: command.useSoundClassification,
                    useAudioDetails: command.useAudioDetails,
                    useBarcodeDetection: command.useBarcodeDetection,
                    useFaceDetection: command.useFaceDetection,
                    useRectangleDetection: command.useRectangleDetection,
                    useSubjectClassification: command.useSubjectClassification,
                    outputKind: command.outputKind,
                    actionScript: command.actionScript,
                    showResponse: command.showResponse,
                    useSaliencyAnalysis: command.useSaliencyAnalysis,
                    scriptKind: command.scriptKind,
                  }}
                />
              }
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />

            <Action
              title="Share To PromptLab Store"
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
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
                        acceptedFileExtensions: command.acceptedFileExtensions,
                        useMetadata: command.useMetadata ? "TRUE" : "FALSE",
                        useAudioDetails: command.useAudioDetails ? "TRUE" : "FALSE",
                        useSoundClassification: command.useSoundClassification ? "TRUE" : "FALSE",
                        useSubjectClassification: command.useSubjectClassification ? "TRUE" : "FALSE",
                        useRectangleDetection: command.useRectangleDetection ? "TRUE" : "FALSE",
                        useBarcodeDetection: command.useBarcodeDetection ? "TRUE" : "FALSE",
                        useFaceDetection: command.useFaceDetection ? "TRUE" : "FALSE",
                        outputKind: command.outputKind,
                        actionScript: command.actionScript || "None",
                        showResponse: command.showResponse ? "TRUE" : "FALSE",
                        description: command.description || "None",
                        useSaliencyAnalysis: command.useSaliencyAnalysis ? "TRUE" : "FALSE",
                        exampleOutput: "",
                        author: command.author,
                        website: command.website,
                        version: command.version,
                        requirements: command.requirements,
                        scriptKind: command.scriptKind,
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
              <Action.CreateQuicklink
                quicklink={{
                  link: `${QUICKLINK_URL_BASE}${encodeURI(command.name)}%22${
                    command.prompt?.includes("{{input}}") ? "%2C%22queryInput%22%3A%22{Input}%22" : ""
                  }%7D`,
                  name: command.name,
                }}
              />
              <Action.Push
                title="Edit Command"
                target={
                  <CommandForm
                    oldData={{
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
                    }}
                    setCommands={setCommands}
                  />
                }
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.Push
                title="Create Derivative"
                target={
                  <CommandForm
                    oldData={{
                      name: command.name + " Copy",
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
                      outputKind: command.outputKind,
                      actionScript: command.actionScript,
                      showResponse: command.showResponse,
                      description: command.description,
                      useSaliencyAnalysis: command.useSaliencyAnalysis,
                      author: command.author,
                      website: command.website,
                      version: "1.0.0",
                      requirements: command.requirements,
                      scriptKind: command.scriptKind,
                    }}
                    setCommands={setCommands}
                    duplicate={true}
                  />
                }
                icon={Icon.EyeDropper}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
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
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
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
                shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "d" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    ));

  return (
    <List
      isLoading={!commands}
      searchText={searchText}
      onSearchTextChange={(text) => setSearchText(text)}
      filtering={true}
      isShowingDetail={commands != undefined}
      searchBarPlaceholder={`Search ${
        !commands || commands.length == 1 ? "commands..." : `${commands.length} commands...`
      }`}
    >
      <List.EmptyView title="No Custom Commands" />
      {listItems}
    </List>
  );
}
