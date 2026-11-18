import { Action, Alert, Icon, confirmAlert } from "@raycast/api";
import { callTool, navigate } from "./client";
import { commandURL, SavedCommand, title } from "./model";
import { Perform } from "./use-operation";

export function CommandActions({
  command,
  perform,
  refresh,
}: {
  command: SavedCommand;
  perform: Perform;
  refresh: () => Promise<void>;
}) {
  const running = command.state?.status === "running";
  const invoke = async (tool: string, label: string) => {
    await perform(label, () => callTool(tool, { id: command.id }), refresh);
  };

  return (
    <>
      <Action
        title="Open Shell"
        icon={Icon.Terminal}
        onAction={async () => {
          await perform("Open Shell", () =>
            navigate(commandURL("open", command.id)),
          );
        }}
      />
      {command.state && (
        <Action
          title={running ? "Stop" : "Start"}
          icon={running ? Icon.Stop : Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() =>
            invoke(
              running ? "stop_command" : "run_command",
              running ? "Stop" : "Start",
            )
          }
        />
      )}
      <Action
        title="Edit Command"
        icon={Icon.Pencil}
        onAction={async () => {
          await perform("Edit Command", () =>
            navigate(commandURL("edit", command.id)),
          );
        }}
      />
      <Action
        title="Restart"
        icon={Icon.ArrowClockwise}
        onAction={() => invoke("restart_command", "Restart")}
      />
      <Action.CopyToClipboard
        title="Copy Path"
        content={command.workingDirectory}
      />
      <Action.OpenWith title="Open in" path={command.workingDirectory} />
      <Action
        title="Delete Command"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          if (
            await confirmAlert({
              title: `Delete “${title(command)}”?`,
              message:
                "This deletes the saved command and its terminal data, including its running session.",
              primaryAction: {
                title: "Delete Command",
                style: Alert.ActionStyle.Destructive,
              },
            })
          )
            await invoke("delete_command", "Delete Command");
        }}
      />
    </>
  );
}
