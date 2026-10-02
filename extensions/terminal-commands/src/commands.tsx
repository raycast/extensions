import { Action, ActionPanel, Alert, closeMainWindow, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { createDeeplink, showFailureToast, useLocalStorage } from "@raycast/utils";
import { randomUUID } from "crypto";
import { CommandForm, CommandFormValues } from "./command-form";
import { DEFAULT_COMMANDS, SavedCommand, STORAGE_KEY } from "./storage";
import { runInTerminal } from "./terminal";

export default function Command() {
  const {
    value: commands,
    setValue: setCommands,
    isLoading,
  } = useLocalStorage<SavedCommand[]>(STORAGE_KEY, DEFAULT_COMMANDS);

  async function createCommand(values: CommandFormValues) {
    await setCommands([...(commands ?? []), { id: randomUUID(), ...values }]);
  }

  async function editCommand(id: string, values: CommandFormValues) {
    await setCommands(
      (commands ?? []).map((savedCommand) => (savedCommand.id === id ? { id, ...values } : savedCommand)),
    );
  }

  async function deleteCommand(savedCommand: SavedCommand) {
    const confirmed = await confirmAlert({
      title: `Delete "${savedCommand.name}"?`,
      message: "Quicklinks that point to this command will stop working.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await setCommands((commands ?? []).filter(({ id }) => id !== savedCommand.id));
    }
  }

  async function run(savedCommand: SavedCommand) {
    try {
      await runInTerminal(savedCommand.command);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Could not open Terminal" });
    }
  }

  const createAction = (
    <Action.Push
      title="Create Command"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CommandForm onSubmit={createCommand} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search commands">
      <List.Section title="Commands">
        {commands?.map((savedCommand) => {
          const lines = savedCommand.command.split("\n");
          return (
            <List.Item
              key={savedCommand.id}
              icon={Icon.Terminal}
              title={savedCommand.name}
              subtitle={lines[0]}
              accessories={lines.length > 1 ? [{ text: `${lines.length} lines` }] : []}
              actions={
                <ActionPanel>
                  <Action title="Run in Terminal" icon={Icon.Play} onAction={() => run(savedCommand)} />
                  <Action.CreateQuicklink
                    quicklink={{
                      name: savedCommand.name,
                      link: createDeeplink({ command: "run-command", context: { id: savedCommand.id } }),
                    }}
                  />
                  <Action.Push
                    title="Edit Command"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <CommandForm
                        initialValues={{ name: savedCommand.name, command: savedCommand.command }}
                        onSubmit={(values) => editCommand(savedCommand.id, values)}
                      />
                    }
                  />
                  {createAction}
                  <Action
                    title="Delete Command"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteCommand(savedCommand)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Item icon={Icon.Plus} title="Create Command" actions={<ActionPanel>{createAction}</ActionPanel>} />
    </List>
  );
}
