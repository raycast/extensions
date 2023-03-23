import { Action, ActionPanel, Alert, confirmAlert, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./CommandResponse";
import { installDefaults } from "./file-utils";
import FileAICommandForm from "./FileAICommandForm";
import { Command } from "./types";

export default function Command(props: { arguments: { commandName: string } }) {
  const { commandName } = props.arguments;
  const [commands, setCommands] = useState<Command[]>();

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
        minNumFiles={parseInt(command.minNumFiles)}
        acceptedFileExtensions={
          command.acceptedFileExtensions.trim().length > 0
            ? command.acceptedFileExtensions.split(",").map((value) => value.trim())
            : undefined
        }
        skipMetadata={!command.useFileMetadata}
        skipAudioDetails={!command.useSoundClassifications}
      />
    );
  }

  const listItems = commands
    ?.sort((a, b) => (a.name > b.name ? 1 : -1))
    .map((command) => (
      <List.Item
        title={command.name}
        icon={{ source: command.icon }}
        key={command.name}
        actions={
          <ActionPanel>
            <Action.Push
              title="Run File AI Command"
              target={
                <CommandResponse
                  commandName={command.name}
                  prompt={command.prompt}
                  minNumFiles={parseInt(command.minNumFiles)}
                  acceptedFileExtensions={
                    command.acceptedFileExtensions.trim().length > 0
                      ? command.acceptedFileExtensions.split(",").map((value) => value.trim())
                      : undefined
                  }
                  skipMetadata={!command.useFileMetadata}
                  skipAudioDetails={!command.useSoundClassifications}
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
                target={<FileAICommandForm oldData={command} setCommands={setCommands} />}
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
      searchText={commandName != "" ? commandName : undefined}
      searchBarPlaceholder={`Search ${
        !commands || commands.length == 1 ? "commands..." : `${commands.length} commands...`
      }`}
    >
      <List.EmptyView title="No Custom File AI Commands" />
      {listItems}
    </List>
  );
}
