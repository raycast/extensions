import { ActionPanel, Action, List } from "@raycast/api";
import { runCommand } from "./utils";

export default function Command() {
  const commands = [
    {
      id: "backup-configs",
      title: "Backup Configs",
      subtitle: "Backup Config Files in Repo",
    },
    {
      id: "restore-configs",
      title: "Restore Configs",
      subtitle: "Restore Config Files to Local",
    },
    {
      id: "show-diffs",
      title: "Show Diffs",
      subtitle: "Displays Diffs Among Config",
    },
    {
      id: "show-status",
      title: "Show Status",
      subtitle: "Displays Status Between Configs",
    },
  ];

  return (
    <List>
      {commands.map((command) => (
        <List.Item
          key={command.id}
          title={command.title}
          subtitle={command.subtitle}
          actions={
            <ActionPanel>
              <Action
                title={`Run ${command.title}`}
                onAction={() => {
                  // Using Raycast's native command API
                  runCommand(command.id);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
