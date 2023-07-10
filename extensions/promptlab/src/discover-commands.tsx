import { Action, ActionPanel, Color, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./components/CommandResponse";
import CommandForm from "./components/CommandForm";
import { Command, StoreCommand } from "./utils/types";
import { useCachedState, useFetch } from "@raycast/utils";
import { STORE_ENDPOINT, STORE_KEY } from "./utils/constants";
import { getCommandJSON } from "./utils/command-utils";
import CategoryDropdown from "./components/CategoryDropdown";

export default function Discover() {
  const [myCommands, setMyCommands] = useState<Command[]>();
  const [availableCommands, setAvailableCommands] = useCachedState<StoreCommand[]>("availableCommands", []);
  const [targetCategory, setTargetCategory] = useState<string>("All");

  useEffect(() => {
    // Get installed commands from local storage
    Promise.resolve(LocalStorage.allItems()).then((commandData) => {
      const commandDataFiltered = Object.values(commandData).filter(
        (cmd, index) =>
          Object.keys(commandData)[index] != "--defaults-installed" && !Object.keys(cmd)[index].startsWith("id-")
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

  const listItems = availableCommands
    .filter((command) => command.categories?.split(", ").includes(targetCategory) || targetCategory == "All")
    .map((command) => (
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

${command.author?.length && command.author !== "None" ? `Author: ${command.author}` : ``}

${command.website?.length && command.website !== "None" ? `Website: [${command.website}](${command.website})` : ``}
  
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

## Categor${command.categories?.length && command.categories.split(", ").length > 1 ? "ies" : "y"}

${
  command.categories
    ?.split(", ")
    .sort((a, b) => (a > b ? 1 : -1))
    .join(", ") || "Other"
}

${
  command.exampleOutput && command.exampleOutput !== "None"
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
  | Accepted File Extensions | ${
    command.minNumFiles == "0"
      ? "N/A"
      : command.acceptedFileExtensions?.length && command.acceptedFileExtensions !== "None"
      ? command.acceptedFileExtensions
      : "Any"
  } |
  | Creativity | ${command.temperature == undefined || command.temperature == "" ? "1.0" : command.temperature} |
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
                  acceptedFileExtensions:
                    command.acceptedFileExtensions == "None" ? "" : command.acceptedFileExtensions,
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
                  categories: command.categories?.split(", ") || ["Other"],
                  temperature: command.temperature,
                };
                LocalStorage.setItem(cmdName, JSON.stringify(commandData)).then(() => {
                  showToast({ title: "Command Installed", message: `${command.name}" has been installed.` });
                  Promise.resolve(LocalStorage.allItems()).then((commandData) => {
                    const commandDataFiltered = Object.values(commandData).filter(
                      (cmd, index) =>
                        Object.keys(commandData)[index] != "--defaults-installed" &&
                        !Object.keys(cmd)[index].startsWith("id-")
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
                    temperature: command.temperature,
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
                      acceptedFileExtensions:
                        command.acceptedFileExtensions == "None" ? "" : command.acceptedFileExtensions,
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
                      categories: command.categories?.split(", ") || ["Other"],
                      temperature:
                        command.temperature == undefined || command.temperature == "" ? "1.0" : command.temperature,
                    }}
                    setCommands={setMyCommands}
                    duplicate={true}
                  />
                }
                icon={Icon.EyeDropper}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
              <Action
                title="Install All Commands"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
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
                      acceptedFileExtensions:
                        command.acceptedFileExtensions == "None" ? "" : command.acceptedFileExtensions,
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
                      categories: command.categories?.split(", ") || ["Other"],
                      temperature: command.temperature,
                    };
                    await LocalStorage.setItem(cmdName, JSON.stringify(commandData));
                    successes.push(command.name);

                    const allCommands = await LocalStorage.allItems();
                    const filteredCommands = Object.values(allCommands).filter(
                      (cmd, index) =>
                        Object.keys(allCommands)[index] != "--defaults-installed" &&
                        !Object.keys(cmd)[index].startsWith("id-")
                    );
                    setMyCommands(filteredCommands.map((data) => JSON.parse(data)));
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
      searchBarAccessory={<CategoryDropdown onSelection={setTargetCategory} />}
    >
      <List.EmptyView title="No Custom PromptLab Commands" />
      <List.Section title="Newest Commands">{listItems.slice(0, 5)}</List.Section>
      <List.Section title="————————————————————">{listItems.slice(5)}</List.Section>
    </List>
  );
}
