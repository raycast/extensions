import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { callTool, navigate } from "./client";
import { commandURL, matches, SavedCommand, title } from "./model";
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
  const { pop } = useNavigation();
  const [query, setQuery] = useState("");
  const running = command.state?.status === "running";
  const invoke = async (tool: string, label: string) => {
    if (
      await perform(label, async () => {
        await callTool(tool, { id: command.id });
        await refresh();
      })
    )
      pop();
  };
  const actions = [
    {
      id: "open",
      title: "Open Shell",
      subtitle: "Show this command’s terminal",
      icon: Icon.Terminal,
      run: () =>
        perform("Open Shell", () => navigate(commandURL("open", command.id))),
    },
    {
      id: "edit",
      title: "Edit Command",
      subtitle: "Change the name, folder, or command",
      icon: Icon.Pencil,
      run: () =>
        perform("Edit Command", () => navigate(commandURL("edit", command.id))),
    },
    ...(command.state
      ? [
          {
            id: "toggle",
            title: running ? "Stop" : "Start",
            subtitle: running ? "Stop this command" : "Start this command",
            icon: running ? Icon.Stop : Icon.Play,
            run: () =>
              invoke(
                running ? "stop_command" : "run_command",
                running ? "Stop" : "Start",
              ),
          },
        ]
      : []),
    {
      id: "restart",
      title: "Restart",
      subtitle: "Stop and start this command again",
      icon: Icon.ArrowClockwise,
      run: () => invoke("restart_command", "Restart"),
    },
    {
      id: "copy",
      title: "Copy Path",
      subtitle: "Copy the working folder path",
      icon: Icon.Clipboard,
      run: async () => {
        await Clipboard.copy(command.workingDirectory);
        pop();
      },
    },
    {
      id: "open-in",
      title: "Open In",
      subtitle: "Open the working folder in another app",
      icon: Icon.AppWindow,
      run: undefined,
    },
    {
      id: "delete",
      title: "Delete Command",
      subtitle: "Delete this command and its terminal data",
      icon: Icon.Trash,
      run: async () => {
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
      },
    },
  ];
  return (
    <List
      navigationTitle={title(command)}
      searchBarPlaceholder="Search actions"
      filtering={false}
      onSearchTextChange={setQuery}
    >
      {actions
        .filter((action) => matches([action.title, action.subtitle], query))
        .map((action) => (
          <List.Item
            key={action.id}
            title={action.title}
            subtitle={action.subtitle}
            icon={action.icon}
            actions={
              <ActionPanel>
                {action.id === "open-in" ? (
                  <Action.OpenWith
                    title="Open in"
                    path={command.workingDirectory}
                  />
                ) : (
                  <Action
                    title={action.title}
                    icon={action.icon}
                    style={
                      action.id === "delete"
                        ? Action.Style.Destructive
                        : Action.Style.Regular
                    }
                    onAction={async () => {
                      await action.run?.();
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
