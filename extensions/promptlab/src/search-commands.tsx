import { Action, ActionPanel, Alert, Clipboard, Color, confirmAlert, Icon, List, LocalStorage, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./CommandResponse";
import { installDefaults } from "./utils/file-utils";
import CommandForm from "./CommandForm";
import { Command } from "./utils/types";

export default function Command(props: { arguments: { commandName: string } }) {
  const { commandName } = props.arguments;
  const [commands, setCommands] = useState<Command[]>();
  const [searchText, setSearchText] = useState<string | undefined>(
    commandName == undefined ? undefined : commandName.trim()
  );

  useEffect(() => {
    /* Add default commands if necessary, then get all commands */
    Promise.resolve(installDefaults()).then(() => {
      Promise.resolve(LocalStorage.allItems()).then((commandData) => {
        const commandDataFiltered = Object.values(commandData).filter(
          (cmd, index) => Object.keys(commandData)[index] != "--defaults-installed"
        );
        setCommands(commandDataFiltered.map((data) => JSON.parse(data)));
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
        }}
      />
    );
  }

  const listItems = commands
    ?.sort((a, b) => (a.name > b.name ? 1 : -1))
    .map((command) => (
      <List.Item
        title={command.name}
        icon={{ source: command.icon, tintColor: command.iconColor == undefined ? Color.PrimaryText : command.iconColor }}
        key={command.name}
        actions={
          <ActionPanel>
            <Action.Push
              title="Run File AI Command"
              target={
                <CommandResponse
                  commandName={command.name}
                  prompt={command.prompt}
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
                content={JSON.stringify(command)}
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
                      Clipboard.copy(JSON.stringify(items)).then(() => showHUD("Copied All File AI Commads"));
                    })
                  );
                }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Command Controls">
              <Action.CreateQuicklink
                quicklink={{
                  link: `raycast://extensions/HelloImSteven/file-ai/search-commands?arguments=%7B%22commandName%22:%22${encodeURI(
                    command.name
                  )}%22%7D`,
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
                      minNumFiles: command.minNumFiles as unknown as string,
                      acceptedFileExtensions: command.acceptedFileExtensions,
                      useMetadata: command.useMetadata,
                      useAudioDetails: command.useAudioDetails,
                      useSoundClassification: command.useSoundClassification,
                      useSubjectClassification: command.useSubjectClassification,
                      useRectangleDetection: command.useRectangleDetection,
                      useBarcodeDetection: command.useBarcodeDetection,
                      useFaceDetection: command.useFaceDetection,
                      outputKind: command.outputKind,
                    }}
                    setCommands={setCommands}
                  />
                }
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
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
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
      searchBarPlaceholder={`Search ${
        !commands || commands.length == 1 ? "commands..." : `${commands.length} commands...`
      }`}
    >
      <List.EmptyView title="No Custom File AI Commands" />
      {listItems}
    </List>
  );
}
