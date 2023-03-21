import { Action, ActionPanel, Alert, confirmAlert, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./CommandResponse";
import { installDefaults } from "./file-utils";
import FileAICommandForm from "./FileAICommandForm";
import { Command } from "./types";

export default function Command() {
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
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    ));

  return (
    <List isLoading={!commands}>
      <List.EmptyView title="No Custom File AI Commands" />
      {listItems}
    </List>
  );
}
