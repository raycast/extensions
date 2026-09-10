import { Action, Icon, LaunchType, useNavigation } from "@raycast/api";
import type { Command } from "../type";
import { DEFAULT_COMMANDS, useCommand } from "../hooks/useCommand";
import { DestructiveAction } from ".";
import { CommandForm } from "../views/command/from";
import CommandView from "../views/command/command-view";
import packageJson from "../../package.json";

export function RunCommandAction({ command }: { command: Command }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Run AI Command"
      icon={Icon.Play}
      onAction={() =>
        push(
          <CommandView
            arguments={{}}
            draftValues={{}}
            launchType={LaunchType.UserInitiated}
            launchContext={{ commandId: command.id }}
          />,
        )
      }
    />
  );
}

export function CommandManagementActions({
  command,
  onCreated,
}: {
  command: Command;
  onCreated?: (command: Command) => void;
}) {
  const commands = useCommand();
  const { push } = useNavigation();
  const isDefault = commands.isDefault(command.id);
  return (
    <>
      <Action
        title="Duplicate AI Command"
        icon={Icon.Duplicate}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => push(<CommandForm cmd={command} isNew use={{ commands }} onSaved={onCreated} />)}
      />
      <Action.CreateQuicklink
        quicklink={{
          name: command.name,
          link: `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/${packageJson.author}/${packageJson.name}/search-ai-command?context=${encodeURIComponent(JSON.stringify({ commandId: command.id }))}`,
        }}
      />
      <DestructiveAction
        title={isDefault ? "Reset AI Command" : "Remove AI Command"}
        icon={isDefault ? Icon.Repeat : Icon.Trash}
        dialog={{ title: isDefault ? "Restore this AI command's default settings?" : "Remove this AI command?" }}
        onAction={async () => {
          try {
            if (isDefault) await commands.update(DEFAULT_COMMANDS[command.id]);
            else await commands.remove(command);
          } catch {
            /* The store displays the failure. */
          }
        }}
      />
    </>
  );
}
