import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { NewContainingDirectory } from "./NewContainingDirectory";
import {
  useLaunchCommands,
  useMoveLaunchCommand,
  useContainingDirectories,
  useRemoveLaunchCommand,
  useRemoveContainingDirectory,
} from "../configApi";
import { UpsertLaunchCommand } from "./UpsertLaunchCommand";
import { getAvatarIcon } from "@raycast/utils";

export function SettingsView() {
  const navigation = useNavigation();

  const containingDirectories = useContainingDirectories();
  const removeContainingDirectories = useRemoveContainingDirectory();

  const launchCommands = useLaunchCommands();
  const removeLaunchCommand = useRemoveLaunchCommand();
  const moveLaunchCommand = useMoveLaunchCommand();

  return (
    <List>
      <List.Section title="Containing Directories" subtitle="Directores that contain your projects (e.g. `~/Code`)">
        {[
          containingDirectories.map((dir) => (
            <List.Item
              key={dir}
              title={dir}
              icon={Icon.Folder}
              actions={
                <ActionPanel>
                  <Action.ShowInFinder title="Show in Finder" path={dir} />
                  <Action
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={DELETE_SHORTCUT}
                    title={`Remove ${dir}`}
                    onAction={() => removeContainingDirectories(dir)}
                  />
                </ActionPanel>
              }
            />
          )),
        ]}

        <List.Item
          title="New Containing Directory"
          icon={{ source: Icon.PlusCircle, tintColor: "raycast-green" }}
          actions={
            <ActionPanel>
              <Action
                title="New Containing Directory"
                icon={{ source: Icon.PlusCircle, tintColor: "raycast-green" }}
                onAction={() => {
                  navigation.push(<NewContainingDirectory />);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Launch Commands" subtitle="Applications or commands that will launch your project">
        {launchCommands.map((cmd) => (
          <List.Item
            title={cmd.title}
            key={cmd.id}
            icon={getAvatarIcon(cmd.title)}
            actions={
              <ActionPanel>
                <Action
                  title={`Edit ${cmd.title}`}
                  icon={Icon.Pencil}
                  onAction={() => navigation.push(<UpsertLaunchCommand existingCommand={cmd} />)}
                />
                <Action
                  icon={Icon.ArrowUpCircleFilled}
                  title="Move to Top"
                  onAction={() => moveLaunchCommand(cmd, "top")}
                />
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUpCircle}
                  shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
                  onAction={() => moveLaunchCommand(cmd, "up")}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDownCircle}
                  shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
                  onAction={() => moveLaunchCommand(cmd, "down")}
                />
                <Action
                  title="Move to Bottom"
                  icon={Icon.ArrowDownCircleFilled}
                  onAction={() => moveLaunchCommand(cmd, "bottom")}
                />
                <Action
                  title={`Remove ${cmd.title}`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={DELETE_SHORTCUT}
                  onAction={() => removeLaunchCommand(cmd.id)}
                />
              </ActionPanel>
            }
          />
        ))}

        <List.Item
          title="New Launch Command"
          icon={{ source: Icon.PlusCircle, tintColor: "raycast-green" }}
          actions={
            <ActionPanel>
              <Action title="New Launch Command" onAction={() => navigation.push(<UpsertLaunchCommand />)} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

const DELETE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["ctrl"], key: "x" };
